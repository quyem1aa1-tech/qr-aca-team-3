import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import './App.css';

const API_BASE =
  import.meta.env.NEXT_PUBLIC_API_URL ||
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000`;

const APP_BASE =
  import.meta.env.NEXT_PUBLIC_APP_URL ||
  import.meta.env.VITE_APP_URL ||
  window.location.origin;

const SCAN_TOKEN_KEY = 'qr_scan_token';

// --- Lightweight Path Router & Teacher Auth Store ---
function getAuthSession() {
  try {
    const raw = localStorage.getItem('qr_auth');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setAuthSession(session) {
  if (session) {
    localStorage.setItem('qr_auth', JSON.stringify(session));
  } else {
    localStorage.removeItem('qr_auth');
  }
}

function resolveAllowedPath(auth, requestedPath) {
  if (requestedPath.startsWith('/scan')) return '/scan';
  if (!auth) return '/login';
  if (requestedPath === '/' || requestedPath === '/login') return '/teacher';
  if (!requestedPath.startsWith('/teacher')) return '/teacher';
  return requestedPath;
}

export default function App() {
  const [auth, setAuth] = useState(getAuthSession);
  const [rawPath, setRawPath] = useState(window.location.pathname);

  const path = resolveAllowedPath(auth, rawPath);

  useEffect(() => {
    if (path !== '/scan' && window.location.pathname !== path) {
      window.history.replaceState({}, '', path);
    }
  }, [path]);

  const navigate = useCallback((to, replace = false) => {
    if (replace) {
      window.history.replaceState({}, '', to);
    } else {
      window.history.pushState({}, '', to);
    }
    setRawPath(to.split('?')[0]);
  }, []);

  useEffect(() => {
    const onPopState = () => setRawPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleLogout = useCallback(() => {
    setAuthSession(null);
    setAuth(null);
    navigate('/login', true);
  }, [navigate]);

  const apiFetch = useCallback(
    async (endpoint, options = {}) => {
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };
      if (auth?.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (res.status === 401 && endpoint !== '/auth/login') {
        handleLogout();
        throw new Error('Session expired. Please log in again.');
      }

      if (res.status === 204) {
        return { status: 204, ok: true, data: null };
      }

      const data = await res.json().catch(() => null);
      return { status: res.status, ok: res.ok, data };
    },
    [auth, handleLogout]
  );

  // Public student scan page (no login required)
  if (path === '/scan') {
    return <ScanPage />;
  }

  const handleLoginSuccess = (sessionData) => {
    setAuthSession(sessionData);
    setAuth(sessionData);
    navigate('/teacher', true);
  };

  if (!auth) {
    return <LoginPage onLogin={handleLoginSuccess} apiFetch={apiFetch} />;
  }

  const teacherClassMatch = path.match(/^\/teacher\/classes\/(\d+)$/);

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="nav-brand" onClick={() => navigate('/teacher')}>
          <span className="brand-dot" />
          <span>QR Attendance</span>
          <span className="role-pill">Teacher</span>
        </div>
        <div className="nav-user">
          <span className="user-name">{auth.fullName}</span>
          <button className="btn-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="main-content">
        {path === '/teacher' && (
          <TeacherClassesPage apiFetch={apiFetch} navigate={navigate} />
        )}
        {teacherClassMatch && (
          <TeacherClassDetailPage
            key={teacherClassMatch[1]}
            classId={Number(teacherClassMatch[1])}
            apiFetch={apiFetch}
            navigate={navigate}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// Custom Hooks for QR image & countdown
// ============================================================================
function useQrDataUrl(text, width = 240) {
  const [state, setState] = useState({ text: null, url: '' });

  useEffect(() => {
    if (!text) return;
    let cancelled = false;
    QRCode.toDataURL(text, { width, margin: 2 })
      .then((url) => {
        if (!cancelled) setState({ text, url });
      })
      .catch(() => {
        if (!cancelled) setState({ text, url: '' });
      });
    return () => {
      cancelled = true;
    };
  }, [text, width]);

  return text && state.text === text ? state.url : '';
}

function useExpiryCountdown(expiresAt) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (new Date(expiresAt).getTime() <= current) {
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) return 0;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - nowMs) / 1000));
}

// ============================================================================
// 1. TEACHER LOGIN PAGE (/login)
// ============================================================================
function LoginPage({ onLogin, apiFetch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { ok, data } = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!ok) {
        throw new Error(data?.message || 'Invalid email or password');
      }

      onLogin({
        token: data.token,
        role: 'teacher',
        teacherId: data.teacherId ?? data.userId,
        userId: data.userId ?? data.teacherId,
        fullName: data.fullName,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card">
        <div className="card-header">
          <div className="badge">TEACHER PORTAL</div>
          <h1 className="title">Teacher Login</h1>
          <p className="subtitle">Sign in to manage class QR codes and view attendance</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="form-stack">
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="teacher@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-box">
          <span className="demo-label">Seeded Teacher Account:</span>
          <div className="demo-chips">
            <button
              type="button"
              className="chip"
              onClick={() => fillDemo('teacher@school.edu', 'teacher123')}
            >
              teacher@school.edu / teacher123
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. TEACHER CLASSES LIST (/teacher) — View Only
// ============================================================================
function TeacherClassesPage({ apiFetch, navigate }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { ok, data } = await apiFetch('/teacher/classes');
        if (!active) return;
        if (!ok) throw new Error(data?.message || 'Failed to load classes');
        setClasses(data || []);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [apiFetch]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="badge">TEACHER</div>
          <h1 className="page-title">My Classes</h1>
          <p className="subtitle">
            Select a class to generate a session QR code & PIN and monitor live attendance
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="empty-state">Loading classes...</div>
      ) : classes.length === 0 ? (
        <div className="empty-state">No classes assigned.</div>
      ) : (
        <div className="class-grid">
          {classes.map((cls) => {
            const id = cls.classId ?? cls.class_id;
            const name = cls.className ?? cls.class_name;
            return (
              <div
                key={id}
                className="class-card"
                onClick={() => navigate(`/teacher/classes/${id}`)}
              >
                <div className="class-card-top">
                  <span className="room-badge">Room {cls.room || 'N/A'}</span>
                  <span className="class-id">#{id}</span>
                </div>
                <h2 className="class-name">{name}</h2>
                <div className="class-card-footer">
                  <span>Open Class & Generate QR →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. TEACHER CLASS DETAIL (/teacher/classes/[id])
// ============================================================================
function TeacherClassDetailPage({ classId, apiFetch, navigate }) {
  const [classInfo, setClassInfo] = useState(null);
  const [qr, setQr] = useState(null);
  const [pin, setPin] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().slice(0, 10));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const expiresAt = qr?.expires_at || qr?.expiresAt;
  const scanUrl = qr?.token ? `${APP_BASE}/scan?token=${encodeURIComponent(qr.token)}` : '';
  const qrImage = useQrDataUrl(scanUrl, 250);
  const remainingSec = useExpiryCountdown(expiresAt);

  const fetchAttendance = useCallback(async () => {
    try {
      const { ok, data } = await apiFetch(
        `/classes/${classId}/attendance?date=${encodeURIComponent(dateFilter)}`
      );
      if (ok && Array.isArray(data)) {
        setAttendees(data);
      }
    } catch {
      // ignore background poll errors
    }
  }, [apiFetch, classId, dateFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [classesRes, qrRes, attRes] = await Promise.all([
          apiFetch('/teacher/classes'),
          apiFetch(`/classes/${classId}/qr/active`),
          apiFetch(`/classes/${classId}/attendance?date=${encodeURIComponent(dateFilter)}`),
        ]);
        if (cancelled) return;

        if (classesRes.ok && Array.isArray(classesRes.data)) {
          const found = classesRes.data.find((c) => (c.classId ?? c.class_id) === classId);
          if (found) setClassInfo(found);
        }
        if (qrRes.status === 204) {
          setQr(null);
        } else if (qrRes.ok && qrRes.data) {
          setQr(qrRes.data);
        }
        if (attRes.ok && Array.isArray(attRes.data)) {
          setAttendees(attRes.data);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, classId, dateFilter]);

  // Auto-refresh attendance list every 5 seconds while QR is active
  useEffect(() => {
    if (!qr || remainingSec <= 0) return;
    const pollId = setInterval(fetchAttendance, 5000);
    return () => clearInterval(pollId);
  }, [qr, remainingSec, fetchAttendance]);

  const handleGenerateQr = async () => {
    setGenerating(true);
    setError('');
    try {
      const { ok, data } = await apiFetch(`/classes/${classId}/qr`, {
        method: 'POST',
      });
      if (!ok) {
        throw new Error(data?.message || 'Could not generate QR code');
      }
      setQr(data);
      setPin(data.pin || null);
      await fetchAttendance();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="page-container">
      <button className="btn-back" onClick={() => navigate('/teacher')}>
        ← Back to Classes
      </button>

      <div className="teacher-split">
        {/* Left panel: QR Generator, Large 4-Digit PIN & Expiry Countdown */}
        <div className="glass-card qr-panel">
          <div className="card-header">
            <div className="badge">ROOM {classInfo?.room || '---'}</div>
            <h1 className="title">
              {classInfo?.className || classInfo?.class_name || `Class #${classId}`}
            </h1>
            <p className="subtitle">Display QR and 4-digit PIN on the classroom screen</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {qr ? (
            <div className="qr-box">
              <div className="qr-and-pin">
                {qrImage && (
                  <div className="qr-image-frame">
                    <img src={qrImage} alt="Class Session QR Code" className="qr-img" />
                  </div>
                )}

                <div className="pin-display-box">
                  <span className="pin-label">SESSION PIN</span>
                  {pin ? (
                    <div className="pin-digits">{pin}</div>
                  ) : (
                    <div className="pin-hidden-note">
                      PIN is shown only once when generated. Generate a new QR if lost.
                    </div>
                  )}
                </div>
              </div>

              {remainingSec > 0 ? (
                <div className="countdown-pill">
                  Expires in: <strong>{formatDuration(remainingSec)}</strong>
                </div>
              ) : (
                <div className="countdown-pill expired-pill">
                  <strong>Expired</strong>
                </div>
              )}

              <div className="token-code-box">
                <span>Scan URL:</span>
                <code>{scanUrl}</code>
              </div>
            </div>
          ) : (
            <div className="qr-box inactive">
              <div className="status-icon">📷</div>
              <h3>No Active QR Code</h3>
              <p className="subtitle">
                Click the button below to generate a new QR code and 4-digit PIN for this session.
              </p>
            </div>
          )}

          <button
            className="btn-primary btn-large"
            onClick={handleGenerateQr}
            disabled={generating}
          >
            {generating ? 'Generating QR...' : 'Generate QR'}
          </button>
        </div>

        {/* Right panel: Live Attendance List */}
        <div className="glass-card attendance-panel">
          <div className="attendance-header">
            <div>
              <h2 className="section-title">Attendance List ({attendees.length})</h2>
              <p className="subtitle">
                {qr && remainingSec > 0
                  ? 'Auto-refreshing every 5 seconds...'
                  : 'Attendance records for selected date'}
              </p>
            </div>

            <div className="date-picker-group">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="date-input"
              />
              <button className="btn-secondary" onClick={fetchAttendance}>
                Refresh
              </button>
            </div>
          </div>

          {attendees.length === 0 ? (
            <div className="empty-state">No students marked present for {dateFilter}.</div>
          ) : (
            <div className="table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Code</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Scan Time</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((row, idx) => (
                    <tr key={row.attendanceId}>
                      <td>{idx + 1}</td>
                      <td>
                        <span className="code-badge">{row.studentCode}</span>
                      </td>
                      <td className="font-semibold">{row.fullName}</td>
                      <td className="text-muted">{row.email}</td>
                      <td>{formatTime(row.scanTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. STUDENT SCAN PAGE (/scan?token=...) — No Login
// ============================================================================
function ScanPage() {
  const [token, setToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      sessionStorage.setItem(SCAN_TOKEN_KEY, urlToken);
      window.history.replaceState({}, '', '/scan');
      return urlToken;
    }
    return sessionStorage.getItem(SCAN_TOKEN_KEY) || '';
  });

  const [studentCode, setStudentCode] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success' | 'error' | 'warning', message: string }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      sessionStorage.setItem(SCAN_TOKEN_KEY, urlToken);
      window.history.replaceState({}, '', '/scan');
      setToken(urlToken);
    }
  }, []);

  const clearStoredToken = () => {
    sessionStorage.removeItem(SCAN_TOKEN_KEY);
    setToken('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setResult({
        type: 'error',
        message: 'No active QR token found. Please scan the classroom QR code again.',
      });
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          student_code: studentCode.trim(),
          pin: pin.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        const className = data.class_name || data.className || 'class';
        clearStoredToken();
        setResult({
          type: 'success',
          message: `Attendance recorded for ${className}.`,
        });
        return;
      }

      if (res.status === 401) {
        setResult({ type: 'error', message: 'Invalid code or PIN.' });
      } else if (res.status === 403) {
        setResult({ type: 'error', message: 'You are not enrolled in this class.' });
      } else if (res.status === 409) {
        setResult({ type: 'warning', message: 'Already marked.' });
      } else if (res.status === 410) {
        clearStoredToken();
        setResult({
          type: 'error',
          message: 'This QR has expired. Ask your teacher for a new one.',
        });
      } else if (res.status === 429) {
        clearStoredToken();
        setResult({
          type: 'error',
          message: 'Too many attempts. Ask your teacher for a new QR.',
        });
      } else {
        setResult({
          type: 'error',
          message: data?.message || 'Could not record attendance.',
        });
      }
    } catch {
      setResult({
        type: 'error',
        message: 'Network error. Please check your connection and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card">
        <div className="card-header">
          <div className="badge">STUDENT CHECK-IN</div>
          <h1 className="title">Class Attendance</h1>
          <p className="subtitle">
            Enter your student code and the 4-digit PIN shown on your teacher&apos;s screen
          </p>
        </div>

        {result && <div className={`alert alert-${result.type}`}>{result.message}</div>}

        {!token && result?.type !== 'success' ? (
          <div className="empty-state">
            Please scan the QR code displayed by your teacher to open this page.
          </div>
        ) : result?.type === 'success' ? null : (
          <form onSubmit={handleSubmit} className="form-stack">
            <div className="input-group">
              <label>Student Code</label>
              <input
                type="text"
                placeholder="e.g. SV001"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                required
                autoComplete="off"
              />
            </div>

            <div className="input-group">
              <label>4-Digit PIN</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                placeholder="0000"
                className="pin-input"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || !studentCode.trim() || pin.length !== 4}
            >
              {submitting ? 'Submitting...' : 'Submit Attendance'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// --- Helpers ---
function formatTime(isoString) {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
