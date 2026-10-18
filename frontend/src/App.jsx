import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

export default function App() {
  const [formData, setFormData] = useState({
    fullName: "",
    studentId: "",
    email: "",
  });

  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    const attendancePayload = {
      studentId: formData.studentId.trim(),
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
    };

    try {
      const res = await fetch("http://localhost:8080/api/attendance/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(attendancePayload),
      });

      const result = await res.json();

      if (!res.ok) {
        // Nếu server trả về mã lỗi (ví dụ 400 do trùng MSSV)
        throw new Error(result.message || "Điểm danh thất bại!");
      }

      // Điểm danh thành công
      setStatus({
        type: "success",
        message: result.message,
      });

      setFormData({ fullName: "", studentId: "", email: "" });
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>{cssAnimations}</style>

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.badge}>HỆ THỐNG ĐIỂM DANH</div>
          <h1 style={styles.title}>Sinh Viên Check-In</h1>
          <p style={styles.subtitle}>
            Vui lòng nhập chính xác thông tin để ghi nhận lượt có mặt.
          </p>
        </div>

        {status.message && (
          <div
            style={{
              ...styles.alert,
              backgroundColor:
                status.type === "success"
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(239, 68, 68, 0.15)",
              borderColor: status.type === "success" ? "#10b981" : "#ef4444",
              color: status.type === "success" ? "#34d399" : "#f87171",
            }}
          >
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Họ và tên sinh viên</label>
            <input
              type="text"
              name="fullName"
              placeholder="Nguyễn Văn An"
              value={formData.fullName}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Mã số sinh viên (MSSV)</label>
            <input
              type="text"
              name="studentId"
              placeholder="B21DCCN001"
              value={formData.studentId}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Địa chỉ Gmail</label>
            <input
              type="email"
              name="email"
              placeholder="an.nguyen@gmail.com"
              value={formData.email}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...styles.button,
              opacity: isSubmitting ? 0.7 : 1,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Đang xử lý..." : "Xác nhận điểm danh"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    width: "100%",
    background: "radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 60%, #030712 100%)",
    color: "#f8fafc",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    boxSizing: "border-box",
  },
  card: {
    background: "rgba(30, 41, 59, 0.75)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "24px",
    padding: "40px",
    width: "100%",
    maxWidth: "460px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
  },
  header: {
    textAlign: "center",
    marginBottom: "28px",
  },
  badge: {
    display: "inline-block",
    padding: "4px 14px",
    borderRadius: "9999px",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    background: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    marginBottom: "12px",
  },
  title: {
    margin: "0 0 8px 0",
    fontSize: "24px",
    fontWeight: "700",
    color: "#ffffff",
  },
  subtitle: {
    margin: 0,
    fontSize: "14px",
    color: "#94a3b8",
    lineHeight: "1.5",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#cbd5e1",
  },
  input: {
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    background: "rgba(15, 23, 42, 0.6)",
    color: "#f8fafc",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s ease",
  },
  button: {
    marginTop: "8px",
    padding: "16px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "600",
    boxShadow: "0 4px 14px 0 rgba(37, 99, 235, 0.35)",
    transition: "transform 0.1s, opacity 0.2s",
  },
  alert: {
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1px solid",
    fontSize: "13px",
    marginBottom: "20px",
    lineHeight: "1.4",
  },
};

const cssAnimations = `
  input:focus {
    border-color: #38bdf8 !important;
    box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
  }
  button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px 0 rgba(37, 99, 235, 0.45);
  }
`;