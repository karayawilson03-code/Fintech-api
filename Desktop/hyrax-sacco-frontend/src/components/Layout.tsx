import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, PiggyBank, CreditCard, BarChart3,
  FileText, User, LogOut, Menu, X, ChevronRight
} from "lucide-react";
import Logo from "./logo";

const  GREEN = "#02882f";
const RED = "#C0202A";
const ORANGE = "#E8601A";
const BLACK = "#1A1A1A";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: PiggyBank,       label: "Savings",   path: "/savings"   },
  { icon: CreditCard,      label: "Loans",     path: "/loans"     },
  { icon: BarChart3,       label: "Shares",    path: "/shares"    },
  { icon: FileText,        label: "Statement", path: "/statement" },
  { icon: User,            label: "Profile",   path: "/profile"   },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const [open, setOpen] = useState(false);

  const member = JSON.parse(localStorage.getItem("member") || "{}");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("member");
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f7fa" }}>

      {/* Mobile overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: "260px", background: GREEN, display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 50,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s ease",
        boxShadow: "2px 0 12px rgba(0,0,0,0.15)"
      }}
        className="sidebar"
      >
        {/* Logo area */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Logo size={40} />
            <div>
              <p style={{ color: "white", fontWeight: 700, fontSize: "13px", margin: 0, lineHeight: 1.2 }}>
                HYRAX ACHIEVERS
              </p>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", margin: 0 }}>
                SACCO
              </p>
            </div>
          </div>
        </div>

        {/* Member info */}
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: "8px", padding: "10px 12px" }}>
            <p style={{ color: "white", fontWeight: 600, fontSize: "13px", margin: 0 }}>
              {member.firstName} {member.lastName}
            </p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", margin: "2px 0 0" }}>
              {member.memberNumber}
            </p>
            <span style={{
              background: member.status === "ACTIVE" ? ORANGE : RED,
              color: "white", fontSize: "10px", padding: "1px 8px",
              borderRadius: "10px", fontWeight: 600, marginTop: "4px", display: "inline-block"
            }}>
              {member.status}
            </span>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "1rem 0.75rem", overflowY: "auto" }}>
          {navItems.map(({ icon: Icon, label, path }) => (
            <button
              key={path}
              onClick={() => { navigate(path); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "12px",
                padding: "10px 12px", borderRadius: "8px", border: "none",
                background: isActive(path) ? "rgba(255,255,255,0.15)" : "transparent",
                color: isActive(path) ? "white" : "rgba(255,255,255,0.7)",
                cursor: "pointer", marginBottom: "4px", fontSize: "14px",
                fontWeight: isActive(path) ? 600 : 400,
                transition: "all 0.2s",
                textAlign: "left",
              }}
            >
              <Icon size={18} />
              <span style={{ flex: 1 }}>{label}</span>
              {isActive(path) && <ChevronRight size={14} />}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: "1rem 0.75rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <button
            onClick={logout}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "12px",
              padding: "10px 12px", borderRadius: "8px", border: "none",
              background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)",
              cursor: "pointer", fontSize: "14px", textAlign: "left"
            }}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>

        {/* Color bar */}
        <div style={{ display: "flex", height: "6px" }}>
          <div style={{ flex: 1, background: GREEN }} />
          <div style={{ flex: 1, background: RED }} />
          <div style={{ flex: 1, background: ORANGE }} />
          <div style={{ flex: 1, background: BLACK }} />
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        {/* Top bar */}
        <header style={{
          background: "white", padding: "0 1.5rem", height: "60px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)", position: "sticky", top: 0, zIndex: 30
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => setOpen(!open)}
              style={{ background: "none", border: "none", cursor: "pointer", color: GREEN, padding: "4px" }}
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "15px", color: BLACK }}>
                {navItems.find(n => n.path === location.pathname)?.label || "Dashboard"}
              </p>
              <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>
                Hyrax Achievers SACCO
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: BLACK }}>
                {member.firstName} {member.lastName}
              </p>
              <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>
                {member.role}
              </p>
            </div>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: GREEN, display: "flex", alignItems: "center",
              justifyContent: "center", color: "white", fontWeight: 700, fontSize: "14px"
            }}>
              {member.firstName?.[0]}{member.lastName?.[0]}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
          {children}
        </main>

      </div>
    </div>
  );
}