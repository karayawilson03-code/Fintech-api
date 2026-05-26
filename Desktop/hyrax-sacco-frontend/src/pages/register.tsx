import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerMember } from "../api/auth";
import Logo from "../components/logo";

const RED = "#C0202A";
const GREEN = "#1A6B52";
const ORANGE = "#E8601A";
const BLACK = "#1A1A1A";

const inputStyle = {
  width: "100%", padding: "9px 12px", marginTop: "4px",
  borderRadius: "6px", border: "1.5px solid #ddd",
  fontSize: "14px", boxSizing: "border-box" as const, outline: "none"
};

const labelStyle = { fontSize: "13px", color: GREEN, fontWeight: 600 as const };

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    nationalId: "", kraPin: "", employer: "", password: "",
    nextOfKin: { fullName: "", relationship: "", phone: "", nationalId: "" }
  });

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });
  const updateKin = (field: string, value: string) => setForm({ ...form, nextOfKin: { ...form.nextOfKin, [field]: value } });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await registerMember(form);
      navigate("/");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const sectionLabel = (text: string, color: string) => (
    <p style={{ fontSize: "12px", fontWeight: 700, color, textTransform: "uppercase" as const, letterSpacing: "0.5px", margin: "1rem 0 0.75rem", borderLeft: `3px solid ${color}`, paddingLeft: "8px" }}>
      {text}
    </p>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f7f0", padding: "2rem 0" }}>
      <div style={{ background: "white", borderRadius: "12px", width: "100%", maxWidth: "500px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", overflow: "hidden" }}>

        {/* Color bar top */}
        <div style={{ display: "flex", height: "6px" }}>
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
            <p style={{ color: "#666", fontSize: "13px" }}>Create your member account</p>
          </div>

          {error && (
            <p style={{ color: RED, marginBottom: "1rem", fontSize: "13px", background: "#fef2f2", padding: "8px 12px", borderRadius: "6px" }}>
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit}>

            {sectionLabel("Personal details", GREEN)}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={labelStyle}>First name</label>
                <input value={form.firstName} onChange={e => update("firstName", e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={labelStyle}>Last name</label>
                <input value={form.lastName} onChange={e => update("lastName", e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={labelStyle}>Email address</label>
              <input type="email" value={form.email} onChange={e => update("email", e.target.value)} style={inputStyle} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={labelStyle}>Phone</label>
                <input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="0712345678" style={inputStyle} />
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={labelStyle}>National ID</label>
                <input value={form.nationalId} onChange={e => update("nationalId", e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={labelStyle}>KRA PIN <span style={{ color: "#999", fontWeight: 400 }}>(optional)</span></label>
                <input value={form.kraPin} onChange={e => update("kraPin", e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={labelStyle}>Employer <span style={{ color: "#999", fontWeight: 400 }}>(optional)</span></label>
                <input value={form.employer} onChange={e => update("employer", e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={labelStyle}>Password</label>
              <input type="password" value={form.password} onChange={e => update("password", e.target.value)} placeholder="Min 8 chars, 1 uppercase, 1 number" style={inputStyle} />
            </div>

            {sectionLabel("Next of kin", RED)}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ ...labelStyle, color: RED }}>Full name</label>
                <input value={form.nextOfKin.fullName} onChange={e => updateKin("fullName", e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ ...labelStyle, color: RED }}>Relationship</label>
                <input value={form.nextOfKin.relationship} onChange={e => updateKin("relationship", e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ ...labelStyle, color: RED }}>Phone</label>
                <input value={form.nextOfKin.phone} onChange={e => updateKin("phone", e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ ...labelStyle, color: RED }}>National ID</label>
                <input value={form.nextOfKin.nationalId} onChange={e => updateKin("nationalId", e.target.value)} style={inputStyle} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "11px", background: loading ? "#888" : BLACK, color: "white", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", marginTop: "0.5rem" }}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "1rem", paddingTop: "12px", borderTop: "1px solid #eee" }}>
            <p style={{ fontSize: "13px", color: "#666" }}>
              Already have an account? <Link to="/" style={{ color: ORANGE, fontWeight: 600 }}>Sign in</Link>
            </p>
          </div>
        </div>

        {/* Color bar bottom */}
        <div style={{ display: "flex", height: "6px" }}>
          <div style={{ flex: 1, background: BLACK }} />
          <div style={{ flex: 1, background: ORANGE }} />
          <div style={{ flex: 1, background: RED }} />
          <div style={{ flex: 1, background: GREEN }} />
        </div>
      </div>
    </div>
  );
}