import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:8080`;

// --- Lightweight Path Router & Auth Store ---
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
  if (!auth) return '/login';
  const home = auth.role === 'teacher' ? '/teacher' : '/student';
  if (requestedPath === '/' || requestedPath === '/login') return home;
  if (auth.role === 'student' && !requestedPath.startsWith('/student')) return home;
  if (auth.role === 'teacher' && !requestedPath.startsWith('/teacher')) return home;
  return requestedPath;
}

export default function App() {
  const [auth, setAuth] = useState(getAuthSession);
  const [rawPath, setRawPath] = useState(window.location.pathname);

  const path = resolveAllowedPath(auth, rawPath);

  useEffect(() => {
    if (window.location.pathname !== path) {
      window.history.replaceState({}, '', path);
    }
  }, [path]);

  const navigate = useCallback((to, replace = false) => {
    if (replace) {
      window.history.replaceState({}, '', to);
    } else {
      window.history.pushState({}, '', to);
    }
    setRawPath(to);
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
        throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
      }

      if (res.status === 204) {
        return { status: 204, ok: true, data: null };
      }

      const data = await res.json().catch(() => null);
      return { status: res.status, ok: res.ok, data };
    },
    [auth, handleLogout]
  );

  const handleLoginSuccess = (sessionData) => {
    setAuthSession(sessionData);
    setAuth(sessionData);
    navigate(sessionData.role === 'teacher' ? '/teacher' : '/student', true);
  };

  if (!auth) {
    return <LoginPage onLogin={handleLoginSuccess} apiFetch={apiFetch} />;
  }

  const studentClassMatch = path.match(/^\/student\/classes\/(\d+)$/);
  const teacherClassMatch = path.match(/^\/teacher\/classes\/(\d+)$/);

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div
          className="nav-brand"
          onClick={() => navigate(auth.role === 'teacher' ? '/teacher' : '/student')}
        >
          <span className="brand-dot" />
          <span>QR Attendance</span>
          <span className="role-pill">{auth.role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}</span>
        </div>
        <div className="nav-user">
          <span className="user-name">{auth.fullName}</span>
          <button className="btn-logout" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="main-content">
        {auth.role === 'student' && path === '/student' && (
          <StudentClassesPage apiFetch={apiFetch} navigate={navigate} />
        )}
        {auth.role === 'student' && studentClassMatch && (
          <StudentClassDetailPage
            key={studentClassMatch[1]}
            classId={Number(studentClassMatch[1])}
            apiFetch={apiFetch}
            navigate={navigate}
          />
        )}
        {auth.role === 'teacher' && path === '/teacher' && (
          <TeacherClassesPage apiFetch={apiFetch} navigate={navigate} />
        )}
        {auth.role === 'teacher' && teacherClassMatch && (
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
function useQrDataUrl(token, width = 220) {
  const [state, setState] = useState({ token: null, url: '' });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    QRCode.toDataURL(token, { width, margin: 2 })
      .then((url) => {
        if (!cancelled) setState({ token, url });
      })
      .catch(() => {
        if (!cancelled) setState({ token, url: '' });
      });
    return () => {
      cancelled = true;
    };
  }, [token, width]);

  return token && state.token === token ? state.url : '';
}

function useExpiryCountdown(expiresAt) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) return 0;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - nowMs) / 1000));
}

// ============================================================================
// 1. LOGIN PAGE (/login)
// ============================================================================
function LoginPage({ onLogin, apiFetch }) {
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fillDemo = (demoRole, demoEmail, demoPass) => {
    setRole(demoRole);
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
        body: JSON.stringify({ email: email.trim(), password, role }),
      });

      if (!ok) {
        throw new Error(data?.message || 'Sai email hoặc mật khẩu');
      }

      onLogin({
        token: data.token,
        role: data.role,
        userId: data.userId,
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
          <div className="badge">HỆ THỐNG ĐIỂM DANH QR</div>
          <h1 className="title">Đăng Nhập</h1>
          <p className="subtitle">Chọn vai trò và đăng nhập vào lớp học của bạn</p>
        </div>

        <div className="role-tabs">
          <button
            type="button"
            className={`role-tab ${role === 'student' ? 'active' : ''}`}
            onClick={() => {
              setRole('student');
              setError('');
            }}
          >
            Sinh viên
          </button>
          <button
            type="button"
            className={`role-tab ${role === 'teacher' ? 'active' : ''}`}
            onClick={() => {
              setRole('teacher');
              setError('');
            }}
          >
            Giảng viên
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="form-stack">
          <div className="input-group">
            <label>Email trường</label>
            <input
              type="email"
              placeholder={role === 'teacher' ? 'teacher@school.edu' : 'student1@school.edu'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Mật khẩu</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="demo-box">
          <span className="demo-label">Tài khoản Demo (nhấn để điền nhanh):</span>
          <div className="demo-chips">
            <button
              type="button"
              className="chip"
              onClick={() => fillDemo('teacher', 'teacher@school.edu', 'teacher123')}
            >
              Giảng viên
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => fillDemo('student', 'student1@school.edu', 'student123')}
            >
              Sinh viên 1 (SV001)
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => fillDemo('student', 'student2@school.edu', 'student123')}
            >
              Sinh viên 2 (SV002)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. STUDENT CLASSES LIST (/student)
// ============================================================================
function StudentClassesPage({ apiFetch, navigate }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { ok, data } = await apiFetch('/student/classes');
        if (!active) return;
        if (!ok) throw new Error(data?.message || 'Không tải được danh sách lớp');
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
          <div className="badge">SINH VIÊN</div>
          <h1 className="page-title">Lớp Học Đã Đăng Ký</h1>
          <p className="subtitle">Chọn lớp học để xem mã QR và xác nhận điểm danh hôm nay</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="empty-state">Đang tải danh sách lớp học...</div>
      ) : classes.length === 0 ? (
        <div className="empty-state">Bạn chưa được ghi danh vào lớp học nào.</div>
      ) : (
        <div className="class-grid">
          {classes.map((cls) => (
            <div
              key={cls.classId}
              className="class-card"
              onClick={() => navigate(`/student/classes/${cls.classId}`)}
            >
              <div className="class-card-top">
                <span className="room-badge">Phòng {cls.room || 'N/A'}</span>
                <span className="class-id">#{cls.classId}</span>
              </div>
              <h2 className="class-name">{cls.className}</h2>
              <div className="class-card-footer">
                <span>Mở lớp & Điểm danh →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. STUDENT CLASS DETAIL (/student/classes/[id])
// ============================================================================
function StudentClassDetailPage({ classId, apiFetch, navigate }) {
  const [classInfo, setClassInfo] = useState(null);
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const qrImage = useQrDataUrl(qr?.token, 220);
  const remainingSec = useExpiryCountdown(qr?.expiresAt);

  const loadClassAndQr = useCallback(async () => {
    setLoading(true);
    try {
      const classesRes = await apiFetch('/student/classes');
      if (classesRes.ok && Array.isArray(classesRes.data)) {
        const found = classesRes.data.find((c) => c.classId === classId);
        if (found) setClassInfo(found);
      }

      const qrRes = await apiFetch(`/student/classes/${classId}/qr/active`);
      if (qrRes.status === 204) {
        setQr(null);
      } else if (qrRes.status === 403) {
        setFeedback({ type: 'error', text: 'Bạn không thuộc danh sách lớp học này (403).' });
        setQr(null);
      } else if (qrRes.ok && qrRes.data) {
        setQr(qrRes.data);
      } else {
        setFeedback({ type: 'error', text: qrRes.data?.message || 'Không thể tải QR của lớp' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, classId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [classesRes, qrRes] = await Promise.all([
          apiFetch('/student/classes'),
          apiFetch(`/student/classes/${classId}/qr/active`),
        ]);
        if (cancelled) return;

        if (classesRes.ok && Array.isArray(classesRes.data)) {
          const found = classesRes.data.find((c) => c.classId === classId);
          if (found) setClassInfo(found);
        }

        if (qrRes.status === 204) {
          setQr(null);
        } else if (qrRes.status === 403) {
          setFeedback({ type: 'error', text: 'Bạn không thuộc danh sách lớp học này (403).' });
          setQr(null);
        } else if (qrRes.ok && qrRes.data) {
          setQr(qrRes.data);
        } else {
          setFeedback({ type: 'error', text: qrRes.data?.message || 'Không thể tải QR của lớp' });
        }
      } catch (err) {
        if (!cancelled) setFeedback({ type: 'error', text: err.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, classId]);

  const handleAttend = async (payload) => {
    setSubmitting(true);
    setFeedback({ type: '', text: '' });
    try {
      const { status, ok, data } = await apiFetch('/attendance', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (ok && data) {
        setFeedback({
          type: 'success',
          text: `Điểm danh thành công lớp ${data.className} lúc ${formatTime(data.scanTime)}!`,
        });
        await loadClassAndQr();
        return;
      }

      if (status === 409) {
        setFeedback({ type: 'warning', text: 'Bạn đã điểm danh phiên học này rồi (Already marked).' });
        await loadClassAndQr();
      } else if (status === 410 || status === 400) {
        setFeedback({
          type: 'error',
          text: 'Mã QR đã hết hạn (Expired). Vui lòng báo giảng viên tạo mã mới.',
        });
      } else if (status === 403) {
        setFeedback({ type: 'error', text: 'Bạn không có trong danh sách lớp này (Not enrolled).' });
      } else if (status === 404) {
        setFeedback({ type: 'error', text: 'Không tìm thấy mã QR hợp lệ (404).' });
      } else {
        setFeedback({ type: 'error', text: data?.message || 'Điểm danh thất bại.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container narrow">
      <button className="btn-back" onClick={() => navigate('/student')}>
        ← Quay lại danh sách lớp
      </button>

      <div className="glass-card detail-card">
        <div className="card-header">
          <div className="badge">PHÒNG {classInfo?.room || '---'}</div>
          <h1 className="title">{classInfo?.className || `Lớp #${classId}`}</h1>
          <p className="subtitle">Trạng thái phiên điểm danh hiện tại</p>
        </div>

        {feedback.text && (
          <div className={`alert alert-${feedback.type || 'info'}`}>{feedback.text}</div>
        )}

        {loading ? (
          <div className="empty-state">Đang kiểm tra mã QR của lớp...</div>
        ) : !qr ? (
          <div className="qr-box inactive">
            <div className="status-icon">⏳</div>
            <h3>Chưa có mã QR đang hoạt động (No active QR yet)</h3>
            <p className="subtitle">
              Giảng viên chưa mở mã QR cho buổi học hôm nay hoặc mã trước đó đã hết hạn.
            </p>
            <button className="btn-secondary" onClick={loadClassAndQr}>
              Làm mới trạng thái
            </button>
          </div>
        ) : (
          <div className="qr-box">
            {qrImage && (
              <div className="qr-image-frame">
                <img src={qrImage} alt="Class QR Code" className="qr-img" />
              </div>
            )}

            <div className="countdown-pill">
              {remainingSec > 0
                ? `Còn hiệu lực: ${formatDuration(remainingSec)}`
                : 'Mã QR đã hết thời gian'}
            </div>

            {qr.attended ? (
              <div className="attended-banner">
                ✓ Đã điểm danh lúc <strong>{formatTime(qr.attendedAt)}</strong>
              </div>
            ) : (
              <button
                className="btn-primary btn-large"
                disabled={submitting || remainingSec === 0}
                onClick={() => handleAttend({ qr_id: qr.qrId })}
              >
                {submitting ? 'Đang gửi...' : 'Attend — Xác nhận có mặt ngay'}
              </button>
            )}
          </div>
        )}

        <form
          className="token-manual-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (tokenInput.trim()) {
              handleAttend({ token: tokenInput.trim() });
            }
          }}
        >
          <label>Hoặc nhập mã Token từ QR máy chiếu:</label>
          <div className="token-row">
            <input
              type="text"
              placeholder="Dán mã token QR tại đây..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
            <button
              type="submit"
              className="btn-secondary"
              disabled={submitting || !tokenInput.trim()}
            >
              Gửi mã
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 4. TEACHER CLASSES LIST (/teacher)
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
        if (!ok) throw new Error(data?.message || 'Không tải được danh sách lớp');
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
          <div className="badge">GIẢNG VIÊN</div>
          <h1 className="page-title">Lớp Học Phụ Trách</h1>
          <p className="subtitle">
            Chọn lớp để tạo mã QR điểm danh và theo dõi sinh viên theo thời gian thực
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="empty-state">Đang tải danh sách lớp giảng dạy...</div>
      ) : classes.length === 0 ? (
        <div className="empty-state">Chưa có lớp học nào được phân công.</div>
      ) : (
        <div className="class-grid">
          {classes.map((cls) => (
            <div
              key={cls.classId}
              className="class-card"
              onClick={() => navigate(`/teacher/classes/${cls.classId}`)}
            >
              <div className="class-card-top">
                <span className="room-badge">Phòng {cls.room || 'N/A'}</span>
                <span className="class-id">#{cls.classId}</span>
              </div>
              <h2 className="class-name">{cls.className}</h2>
              <div className="class-card-footer">
                <span>Quản lý QR & Điểm danh →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 5. TEACHER CLASS DETAIL (/teacher/classes/[id])
// ============================================================================
function TeacherClassDetailPage({ classId, apiFetch, navigate }) {
  const [classInfo, setClassInfo] = useState(null);
  const [qr, setQr] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().slice(0, 10));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const qrImage = useQrDataUrl(qr?.token, 260);
  const remainingSec = useExpiryCountdown(qr?.expiresAt);

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
          const found = classesRes.data.find((c) => c.classId === classId);
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
        throw new Error(data?.message || 'Không thể tạo mã QR');
      }
      setQr(data);
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
        ← Quay lại danh sách lớp
      </button>

      <div className="teacher-split">
        {/* Left panel: QR Generator & Display */}
        <div className="glass-card qr-panel">
          <div className="card-header">
            <div className="badge">PHÒNG {classInfo?.room || '---'}</div>
            <h1 className="title">{classInfo?.className || `Lớp #${classId}`}</h1>
            <p className="subtitle">Phát mã QR cho buổi học để sinh viên điểm danh</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {qr && remainingSec > 0 ? (
            <div className="qr-box">
              {qrImage && (
                <div className="qr-image-frame">
                  <img src={qrImage} alt="Active Class QR" className="qr-img" />
                </div>
              )}
              <div className="countdown-pill">
                Hết hạn sau: <strong>{formatDuration(remainingSec)}</strong>
              </div>
              <div className="token-code-box">
                <span>Token:</span>
                <code>{qr.token}</code>
              </div>
            </div>
          ) : (
            <div className="qr-box inactive">
              <div className="status-icon">📷</div>
              <h3>Chưa có mã QR đang hoạt động</h3>
              <p className="subtitle">
                Nhấn nút bên dưới để khởi tạo mã QR mới cho phiên học này.
              </p>
            </div>
          )}

          <button
            className="btn-primary btn-large"
            onClick={handleGenerateQr}
            disabled={generating}
          >
            {generating
              ? 'Đang tạo mã QR...'
              : qr && remainingSec > 0
              ? 'Tạo mã QR mới (Generate New QR)'
              : 'Tạo mã QR điểm danh (Generate QR)'}
          </button>
        </div>

        {/* Right panel: Live Attendance List */}
        <div className="glass-card attendance-panel">
          <div className="attendance-header">
            <div>
              <h2 className="section-title">
                Danh Sách Đã Điểm Danh ({attendees.length})
              </h2>
              <p className="subtitle">
                {qr && remainingSec > 0
                  ? 'Đang tự động cập nhật mỗi 5 giây...'
                  : 'Lịch sử điểm danh theo ngày (UTC)'}
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
                Tải lại
              </button>
            </div>
          </div>

          {attendees.length === 0 ? (
            <div className="empty-state">
              Chưa có sinh viên nào điểm danh trong ngày {dateFilter}.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>MSSV</th>
                    <th>Họ và tên</th>
                    <th>Email</th>
                    <th>Giờ quét</th>
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
