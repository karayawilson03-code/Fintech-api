import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginMember } from "../api/auth";
import Logo from "../components/logo";

const RED = "#C0202A";
const GREEN = "#1A6B52";
const ORANGE = "#E8601A";
const BLACK = "#1A1A1A";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await loginMember(form);
      localStorage.setItem("token", res.data.data.token);
      localStorage.setItem("member", JSON.stringify(res.data.data.member));
      navigate("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f7f0", padding: "2rem 0" }}>
      <div style={{ background: "white", borderRadius: "12px", width: "100%", maxWidth: "400px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        
        {/* Color bar top */}
        <div style={{ display: "flex", height: "12px" }}>
          <div style={{ flex: 1, background: GREEN }} />
          <div style={{ flex: 1, background: RED }} />
          <div style={{ flex: 1, background: ORANGE }} />
          <div style={{ flex: 1, background: BLACK }} />
        </div>

        <div style={{ padding: "2rem" }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <Logo size={72} />
            <h2 style={{ color: BLACK, fontSize: "17px", fontWeight: 700, margin: "10px 0 2px" }}>
              HYRAX ACHIEVERS SACCO
            </h2>
            <p style={{ color: ORANGE, fontSize: "12px", fontStyle: "italic", marginBottom: "4px" }}>
              Together We Achieve
            </p>
            <p style={{ color: "#666", fontSize: "13px" }}>Sign in to your account</p>
          </div>

          {error && (
            <p style={{ color: RED, marginBottom: "1rem", fontSize: "13px", background: "#fef2f2", padding: "8px 12px", borderRadius: "6px" }}>
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "14px", color: GREEN, fontWeight: 600 }}>Email address</label>
              <input 
                type="email" 
                value={form.email} 
                onChange={e => setForm({ ...form, email: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", marginTop: "4px", borderRadius: "6px", border: "1.5px solid #ddd", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "white" }} 
                required 
              />
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ fontSize: "14px", color: GREEN, fontWeight: 600 }}>Password</label>
              <input 
                type="password" 
                value={form.password} 
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", marginTop: "4px", borderRadius: "6px", border: "1.5px solid #ddd", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "white" }} 
                required 
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              style={{ width: "100%", padding: "11px", background: loading ? "#888" : BLACK, color: "white", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "1rem", paddingTop: "12px", borderTop: "1px solid #eee" }}>
            <p style={{ fontSize: "13px", color: "#666" }}>
              No account? <Link to="/register" style={{ color: ORANGE, fontWeight: 600 }}>Register here</Link>
            </p>
          </div>
        </div>

        {/* Color bar bottom */}
        <div style={{ display: "flex", height: "12px" }}>
          <div style={{ flex: 1, background: BLACK }} />
          <div style={{ flex: 1, background: ORANGE }} />
          <div style={{ flex: 1, background: RED }} />
          <div style={{ flex: 1, background: GREEN }} />
        </div>
      </div>
    </div>
  );
}