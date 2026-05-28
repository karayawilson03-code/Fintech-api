import { useEffect, useState } from "react";
import { getDashboard } from "../api/member";
import axios from "axios";
import { GREEN, RED, ORANGE, BLACK } from "../constants/colors";

interface Profile {
  memberNumber: string;
  fullName: string;
  email: string;
  phone: string;
  employer: string;
  role: string;
  status: string;
  memberSince: string;
  nextOfKin: {
    fullName: string;
    relationship: string;
    phone: string;
    nationalId: string;
  } | null;
}

export default function Profile() {
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [activeTab, setActiveTab] = useState<"personal" | "nextofkin" | "security">("personal");

  // ✅ Initial load — async IIFE avoids synchronous setState in effect body
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getDashboard();
        if (!cancelled) {
          setProfile(res.data.data.profile);
          setError("");
        }
      } catch (err) {
        if (!cancelled && axios.isAxiosError(err))
          setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
   
  }, []);

  const fmtDt = (d: string) =>
    new Date(d).toLocaleDateString("en-KE", {
      day: "numeric", month: "long", year: "numeric",
    });

  const statusColor = (s: string) =>
    s === "ACTIVE" ? GREEN : s === "SUSPENDED" ? RED : ORANGE;

  const roleColor = (r: string) => {
    switch (r) {
      case "CEO":          return RED;
      case "ADMIN":        return "#9C27B0";
      case "LOAN_OFFICER": return "#2196F3";
      case "TELLER":       return ORANGE;
      default:             return GREEN;
    }
  };

  const tabs = [
    { key: "personal",  label: "Personal Info" },
    { key: "nextofkin", label: "Next of Kin"   },
    { key: "security",  label: "Security"      },
  ];

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "36px", height: "36px",
          border: `3px solid ${GREEN}`,
          borderTop: "3px solid transparent",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto"
        }} />
        <p style={{ color: GREEN, marginTop: "1rem" }}>Loading profile...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{
      background: "#fef2f2", border: `1px solid ${RED}`,
      borderRadius: "8px", padding: "12px 16px", color: RED
    }}>
      ❌ {error}
    </div>
  );

  if (!profile) return null;

  const initials = profile.fullName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

  return (
    <div>

      {/* Profile Header Card */}
      <div style={{
        background: `linear-gradient(135deg, ${GREEN}, #0d5c14)`,
        borderRadius: "12px", padding: "1.5rem",
        marginBottom: "1rem", color: "white",
        boxShadow: "0 4px 15px rgba(19,126,28,0.3)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "24px", fontWeight: 700, color: "white",
            border: "3px solid rgba(255,255,255,0.4)",
            flexShrink: 0
          }}>
            {initials}
          </div>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 700 }}>
              {profile.fullName}
            </p>
            <p style={{ margin: "0 0 8px", fontSize: "13px", opacity: 0.8 }}>
              {profile.memberNumber}
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span style={{
                background: statusColor(profile.status),
                color: "white", padding: "3px 10px",
                borderRadius: "20px", fontSize: "11px", fontWeight: 600
              }}>
                {profile.status}
              </span>
              <span style={{
                background: roleColor(profile.role),
                color: "white", padding: "3px 10px",
                borderRadius: "20px", fontSize: "11px", fontWeight: 600
              }}>
                {profile.role}
              </span>
            </div>
          </div>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "12px", borderTop: "1px solid rgba(255,255,255,0.2)",
          paddingTop: "1rem"
        }}>
          <div>
            <p style={{ margin: 0, fontSize: "11px", opacity: 0.7 }}>Member Since</p>
            <p style={{ margin: 0, fontWeight: 600, fontSize: "13px" }}>
              {fmtDt(profile.memberSince)}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "11px", opacity: 0.7 }}>Employer</p>
            <p style={{ margin: 0, fontWeight: 600, fontSize: "13px" }}>
              {profile.employer || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: "white", borderRadius: "12px",
        boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden"
      }}>
        <div style={{ display: "flex", borderBottom: "1px solid #eee" }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              style={{
                flex: 1, padding: "12px 8px", border: "none",
                background: "none", cursor: "pointer",
                fontSize: "13px", fontWeight: 600,
                color: activeTab === tab.key ? GREEN : "#888",
                borderBottom: activeTab === tab.key
                  ? `2px solid ${GREEN}`
                  : "2px solid transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "1.25rem" }}>

          {/* Personal Info Tab */}
          {activeTab === "personal" && (
            <div>
              <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 1rem" }}>
                Personal Details
              </p>
              {[
                { label: "Full Name",     value: profile.fullName,                    icon: "👤" },
                { label: "Email Address", value: profile.email,                       icon: "✉️"  },
                { label: "Phone Number",  value: profile.phone,                       icon: "📞" },
                { label: "Employer",      value: profile.employer || "Not provided",  icon: "🏢" },
                { label: "Member Number", value: profile.memberNumber,                icon: "🪪"  },
                { label: "Role",          value: profile.role,                        icon: "🎭" },
                { label: "Status",        value: profile.status,                      icon: "✅" },
                { label: "Member Since",  value: fmtDt(profile.memberSince),          icon: "📅" },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 0", borderBottom: "1px solid #f5f5f5"
                }}>
                  <span style={{ fontSize: "18px", width: "28px", textAlign: "center" }}>
                    {icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                      {label}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: 600, color: BLACK }}>
                      {value}
                    </p>
                  </div>
                </div>
              ))}
              <div style={{
                background: "#f8f9fa", borderRadius: "8px",
                padding: "12px", marginTop: "1rem", border: "1px solid #eee"
              }}>
                <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                  ℹ️ To update your personal details, please visit the SACCO office or
                  contact your administrator.
                </p>
              </div>
            </div>
          )}

          {/* Next of Kin Tab */}
          {activeTab === "nextofkin" && (
            <div>
              <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 1rem" }}>
                Next of Kin Details
              </p>
              {profile.nextOfKin ? (
                <>
                  {[
                    { label: "Full Name",    value: profile.nextOfKin.fullName,    icon: "👤"   },
                    { label: "Relationship", value: profile.nextOfKin.relationship, icon: "👨‍👩‍👧" },
                    { label: "Phone Number", value: profile.nextOfKin.phone,        icon: "📞"   },
                    { label: "National ID",  value: profile.nextOfKin.nationalId,   icon: "🪪"   },
                  ].map(({ label, value, icon }) => (
                    <div key={label} style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "12px 0", borderBottom: "1px solid #f5f5f5"
                    }}>
                      <span style={{ fontSize: "18px", width: "28px", textAlign: "center" }}>
                        {icon}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: "11px", color: "#888", textTransform: "uppercase" }}>
                          {label}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: "14px", fontWeight: 600, color: BLACK }}>
                          {value}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div style={{
                    background: "#f0faf5", borderRadius: "8px",
                    padding: "12px", marginTop: "1rem",
                    border: `1px solid ${GREEN}30`
                  }}>
                    <p style={{ margin: 0, fontSize: "12px", color: GREEN, fontWeight: 600 }}>
                      ✅ Next of kin information is on file
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#888" }}>
                      To update next of kin details, please visit the SACCO office.
                    </p>
                  </div>
                </>
              ) : (
                <div style={{
                  background: "#fef2f2", borderRadius: "8px",
                  padding: "1.5rem", textAlign: "center",
                  border: `1px solid ${RED}30`
                }}>
                  <p style={{ fontSize: "32px", margin: "0 0 8px" }}>⚠️</p>
                  <p style={{ margin: "0 0 4px", fontWeight: 700, color: RED }}>No Next of Kin</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>
                    Please visit the SACCO office to add your next of kin details.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div>
              <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 1rem" }}>
                Account Security
              </p>
              {[
                { icon: "🔐", title: "Password",             desc: "Your account password",              status: "Set",         color: GREEN  },
                { icon: "📱", title: "SMS Notifications",    desc: "Alerts sent to " + profile.phone,    status: "Active",      color: GREEN  },
                { icon: "🔑", title: "Transaction PIN",      desc: "For approving guarantor requests",   status: "Coming Soon", color: ORANGE },
                { icon: "📧", title: "Email Notifications",  desc: "Alerts sent to " + profile.email,    status: "Active",      color: GREEN  },
              ].map(({ icon, title, desc, status, color }) => (
                <div key={title} style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 0", borderBottom: "1px solid #f5f5f5"
                }}>
                  <span style={{ fontSize: "24px", width: "32px", textAlign: "center" }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "14px", color: BLACK }}>{title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>{desc}</p>
                  </div>
                  <span style={{
                    background: `${color}20`, color,
                    fontSize: "11px", padding: "3px 10px",
                    borderRadius: "20px", fontWeight: 600
                  }}>
                    {status}
                  </span>
                </div>
              ))}
              <div style={{
                background: "#f8f9fa", borderRadius: "8px",
                padding: "12px", marginTop: "1rem", border: "1px solid #eee"
              }}>
                <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: "13px", color: BLACK }}>
                  🔒 Want to change your password?
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                  Contact your SACCO administrator or visit the office to reset your password securely.
                </p>
              </div>
              <div style={{
                background: "#f0faf5", borderRadius: "8px",
                padding: "12px", marginTop: "1rem",
                border: `1px solid ${GREEN}30`
              }}>
                <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: "13px", color: GREEN }}>
                  ✅ Your account is secure
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                  All transactions are encrypted and protected. If you notice
                  any suspicious activity, contact the SACCO immediately.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}