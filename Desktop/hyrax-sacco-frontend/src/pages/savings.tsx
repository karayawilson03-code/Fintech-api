import { useEffect, useState } from "react";
import { getSavingsBalance, getSavingsHistory, depositSavings } from "../api/savings";
import axios from "axios";
import { GREEN, RED, ORANGE, BLACK } from "../constants/colors";

interface Balance {
  memberNumber: string;
  firstName: string;
  lastName: string;
  balance: number;
  totalContributions: number;
  minimumMonthlyContribution: number;
}

interface Transaction {
  id: string;
  amount: number;
  balance: number;
  type: string;
  channel: string;
  reference: string;
  createdAt: string;
}

export default function Savings() {
  const [balance, setBalance]       = useState<Balance | null>(null);
  const [history, setHistory]       = useState<Transaction[]>([]);
  const [loading, setLoading]       = useState(true);
  const [depositing, setDepositing] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [form, setForm]             = useState({
    amount: "", channel: "MPESA", reference: ""
  });

  // ✅ Used by handleDeposit after deposit — safe to call setState synchronously
  const load = async () => {
    try {
      const [balRes, histRes] = await Promise.all([
        getSavingsBalance(),
        getSavingsHistory(),
      ]);
      setBalance(balRes.data.data);
      setHistory(histRes.data.data);
    } catch (err) {
      if (axios.isAxiosError(err))
        setError(err.response?.data?.message || "Failed to load savings");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Initial load — async IIFE avoids synchronous setState in effect body
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [balRes, histRes] = await Promise.all([
          getSavingsBalance(),
          getSavingsHistory(),
        ]);
        if (!cancelled) {
          setBalance(balRes.data.data);
          setHistory(histRes.data.data);
          setError("");
        }
      } catch (err) {
        if (!cancelled && axios.isAxiosError(err))
          setError(err.response?.data?.message || "Failed to load savings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
   
  }, []);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositing(true);
    setError("");
    setSuccess("");
    try {
      await depositSavings({
        amount:    Number(form.amount),
        channel:   form.channel,
        reference: form.reference || undefined,
      });
      setSuccess(`KES ${Number(form.amount).toLocaleString()} deposited successfully!`);
      setForm({ amount: "", channel: "MPESA", reference: "" });
      setShowForm(false);
      load(); // re-fetch after deposit — safe here, not inside an effect
    } catch (err) {
      if (axios.isAxiosError(err))
        setError(err.response?.data?.message || "Deposit failed");
    } finally {
      setDepositing(false);
    }
  };

  const fmt = (n: number) => `KES ${n.toLocaleString()}`;

  const channelColor = (ch: string) =>
    ch === "MPESA" ? GREEN : ch === "BANK" ? "#2196F3" : ORANGE;

  const typeColor = (t: string) =>
    t === "DEPOSIT" ? GREEN : t === "WITHDRAWAL" ? RED : "#9C27B0";

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
        <p style={{ color: GREEN, marginTop: "1rem" }}>Loading savings...</p>
      </div>
    </div>
  );

  return (
    <div>

      {/* Success message */}
      {success && (
        <div style={{
          background: "#f0faf5", border: `1px solid ${GREEN}`,
          borderRadius: "8px", padding: "12px 16px",
          marginBottom: "1rem", color: GREEN, fontWeight: 600
        }}>
          ✅ {success}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{
          background: "#fef2f2", border: `1px solid ${RED}`,
          borderRadius: "8px", padding: "12px 16px",
          marginBottom: "1rem", color: RED
        }}>
          ❌ {error}
        </div>
      )}

      {/* Balance Card */}
      <div style={{
        background: `linear-gradient(135deg, ${GREEN}, #0d5c14)`,
        borderRadius: "12px", padding: "1.5rem",
        marginBottom: "1rem", color: "white",
        boxShadow: "0 4px 15px rgba(19,126,28,0.3)"
      }}>
        <p style={{ margin: "0 0 4px", fontSize: "12px", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Current Balance
        </p>
        <p style={{ margin: "0 0 1rem", fontSize: "36px", fontWeight: 700 }}>
          {fmt(balance?.balance || 0)}
        </p>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: "1rem", borderTop: "1px solid rgba(255,255,255,0.2)",
          paddingTop: "1rem"
        }}>
          <div>
            <p style={{ margin: 0, fontSize: "11px", opacity: 0.7 }}>Contributions</p>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "16px" }}>
              {balance?.totalContributions || 0}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "11px", opacity: 0.7 }}>Min Monthly</p>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "16px" }}>
              {fmt(balance?.minimumMonthlyContribution || 1100)}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "11px", opacity: 0.7 }}>Status</p>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "16px", color: ORANGE }}>
              ACTIVE
            </p>
          </div>
        </div>
      </div>

      {/* Deposit Button */}
      <div style={{ marginBottom: "1rem" }}>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: showForm ? "#888" : BLACK,
            color: "white", border: "none", borderRadius: "8px",
            padding: "10px 20px", fontWeight: 600, fontSize: "14px",
            cursor: "pointer"
          }}
        >
          {showForm ? "✕ Cancel" : "+ Make Deposit"}
        </button>
      </div>

      {/* Deposit Form */}
      {showForm && (
        <div style={{
          background: "white", borderRadius: "12px",
          padding: "1.5rem", marginBottom: "1rem",
          boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
          borderTop: `3px solid ${GREEN}`
        }}>
          <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 1rem", fontSize: "15px" }}>
            Make a Deposit
          </p>
          <form onSubmit={handleDeposit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ fontSize: "13px", color: GREEN, fontWeight: 600 }}>
                  Amount (KES)
                </label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  min="1100"
                  placeholder="Min KES 1,100"
                  required
                  style={{
                    width: "100%", padding: "9px 12px", marginTop: "4px",
                    borderRadius: "6px", border: "1.5px solid #ddd",
                    fontSize: "14px", boxSizing: "border-box", color: BLACK,
                    outline: "none"
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "13px", color: GREEN, fontWeight: 600 }}>
                  Channel
                </label>
                <select
                  value={form.channel}
                  onChange={e => setForm({ ...form, channel: e.target.value })}
                  style={{
                    width: "100%", padding: "9px 12px", marginTop: "4px",
                    borderRadius: "6px", border: "1.5px solid #ddd",
                    fontSize: "14px", boxSizing: "border-box", color: BLACK,
                    outline: "none", background: "white"
                  }}
                >
                  <option value="MPESA">M-Pesa</option>
                  <option value="BANK">Bank</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "13px", color: GREEN, fontWeight: 600 }}>
                Reference <span style={{ color: "#999", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                value={form.reference}
                onChange={e => setForm({ ...form, reference: e.target.value })}
                placeholder="e.g. M-Pesa code"
                style={{
                  width: "100%", padding: "9px 12px", marginTop: "4px",
                  borderRadius: "6px", border: "1.5px solid #ddd",
                  fontSize: "14px", boxSizing: "border-box", color: BLACK,
                  outline: "none"
                }}
              />
            </div>

            <button
              type="submit"
              disabled={depositing}
              style={{
                background: depositing ? "#888" : GREEN,
                color: "white", border: "none", borderRadius: "8px",
                padding: "10px 24px", fontWeight: 600, fontSize: "14px",
                cursor: depositing ? "not-allowed" : "pointer"
              }}
            >
              {depositing ? "Processing..." : "Deposit"}
            </button>
          </form>
        </div>
      )}

      {/* Transaction History */}
      <div style={{
        background: "white", borderRadius: "12px",
        padding: "1.5rem", boxShadow: "0 1px 6px rgba(0,0,0,0.07)"
      }}>
        <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 1rem", fontSize: "15px" }}>
          Transaction History
        </p>

        {history.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", padding: "2rem 0" }}>
            No transactions yet
          </p>
        ) : (
          <div>
            {history.map((t, i) => (
              <div key={t.id} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "12px 0",
                borderBottom: i < history.length - 1 ? "1px solid #f0f0f0" : "none"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "50%",
                    background: `${typeColor(t.type)}18`,
                    display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: "18px"
                  }}>
                    {t.type === "DEPOSIT" ? "⬆️" : t.type === "WITHDRAWAL" ? "⬇️" : "💰"}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "13px", color: BLACK }}>
                      {t.type.charAt(0) + t.type.slice(1).toLowerCase()}
                    </p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>
                      {new Date(t.createdAt).toLocaleDateString("en-KE", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                      {t.reference ? ` • ${t.reference}` : ""}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: typeColor(t.type) }}>
                    {t.type === "WITHDRAWAL" ? "-" : "+"}{fmt(t.amount)}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end", marginTop: "4px" }}>
                    <span style={{
                      background: `${channelColor(t.channel)}20`,
                      color: channelColor(t.channel),
                      fontSize: "10px", padding: "2px 8px",
                      borderRadius: "10px", fontWeight: 600
                    }}>
                      {t.channel}
                    </span>
                    <span style={{ fontSize: "11px", color: "#aaa" }}>
                      {fmt(t.balance)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}