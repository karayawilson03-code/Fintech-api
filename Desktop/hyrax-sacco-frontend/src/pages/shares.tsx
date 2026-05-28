import { useEffect, useState } from "react";
import { getShareSummary, buyShares } from "../api/shares";
import axios from "axios";
import { GREEN, RED, ORANGE, BLACK } from "../constants/colors";

interface ShareSummary {
  memberNumber: string;
  firstName: string;
  lastName: string;
  totalUnits: number;
  pricePerUnit: number;
  totalValue: number;
  minimumRequired: number;
  minimumShares: number;
  meetsMinimumCapital: boolean;
  shortfall: number;
}

interface ShareTransaction {
  id: string;
  units: number;
  pricePerUnit: number;
  totalAmount: number;
  type: string;
  reference: string | null;
  createdAt: string;
}

export default function Shares() {
  const [summary, setSummary]   = useState<ShareSummary | null>(null);
  const [history, setHistory]   = useState<ShareTransaction[]>([]);
  const [loading, setLoading]   = useState(true);
  const [buying, setBuying]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [form, setForm]         = useState({
    units: "", channel: "MPESA", reference: ""
  });

  // ✅ Used by handleBuy after purchase — safe to call setState synchronously
  const load = async () => {
    try {
      const [sumRes, histRes] = await Promise.all([
        getShareSummary(),
        axios.get("https://hyrax-sacco-api.onrender.com/api/shares/history", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }),
      ]);
      setSummary(sumRes.data.data);
      setHistory(histRes.data.data);
    } catch (err) {
      if (axios.isAxiosError(err))
        setError(err.response?.data?.message || "Failed to load shares");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Initial load — async IIFE avoids synchronous setState in effect body
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [sumRes, histRes] = await Promise.all([
          getShareSummary(),
          axios.get("https://hyrax-sacco-api.onrender.com/api/shares/history", {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          }),
        ]);
        if (!cancelled) {
          setSummary(sumRes.data.data);
          setHistory(histRes.data.data);
          setError("");
        }
      } catch (err) {
        if (!cancelled && axios.isAxiosError(err))
          setError(err.response?.data?.message || "Failed to load shares");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    
  }, []);

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    setBuying(true);
    setError("");
    setSuccess("");
    try {
      await buyShares({
        units:     Number(form.units),
        channel:   form.channel,
        reference: form.reference || undefined,
      });
      setSuccess(`${form.units} share(s) purchased successfully!`);
      setForm({ units: "", channel: "MPESA", reference: "" });
      setShowForm(false);
      load(); // re-fetch after purchase — safe here, not inside an effect
    } catch (err) {
      if (axios.isAxiosError(err))
        setError(err.response?.data?.message || "Purchase failed");
    } finally {
      setBuying(false);
    }
  };

  const fmt = (n: number) => `KES ${n.toLocaleString()}`;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", marginTop: "4px",
    borderRadius: "6px", border: "1.5px solid #ddd",
    fontSize: "14px", boxSizing: "border-box",
    color: BLACK, outline: "none", background: "white"
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px", color: GREEN, fontWeight: 600
  };

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
        <p style={{ color: GREEN, marginTop: "1rem" }}>Loading shares...</p>
      </div>
    </div>
  );

  const progressPercent = summary
    ? Math.min(100, (summary.totalValue / summary.minimumRequired) * 100)
    : 0;

  return (
    <div>

      {/* Success */}
      {success && (
        <div style={{
          background: "#f0faf5", border: `1px solid ${GREEN}`,
          borderRadius: "8px", padding: "12px 16px",
          marginBottom: "1rem", color: GREEN, fontWeight: 600
        }}>
          ✅ {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: "#fef2f2", border: `1px solid ${RED}`,
          borderRadius: "8px", padding: "12px 16px",
          marginBottom: "1rem", color: RED
        }}>
          ❌ {error}
        </div>
      )}

      {/* Share Capital Card */}
      <div style={{
        background: `linear-gradient(135deg, ${BLACK}, #333)`,
        borderRadius: "12px", padding: "1.5rem",
        marginBottom: "1rem", color: "white",
        boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
      }}>
        <p style={{ margin: "0 0 4px", fontSize: "12px", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Share Capital
        </p>
        <p style={{ margin: "0 0 4px", fontSize: "36px", fontWeight: 700 }}>
          {summary?.totalUnits || 0} units
        </p>
        <p style={{ margin: "0 0 1rem", fontSize: "16px", opacity: 0.8 }}>
          {fmt(summary?.totalValue || 0)}
        </p>

        {/* Progress to minimum */}
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", opacity: 0.7 }}>Progress to minimum capital</span>
            <span style={{ fontSize: "11px", opacity: 0.7 }}>{Math.round(progressPercent)}%</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "4px", height: "8px" }}>
            <div style={{
              background: summary?.meetsMinimumCapital ? GREEN : ORANGE,
              width: `${progressPercent}%`,
              height: "100%", borderRadius: "4px",
              transition: "width 0.5s"
            }} />
          </div>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: "1rem", borderTop: "1px solid rgba(255,255,255,0.15)",
          paddingTop: "1rem"
        }}>
          <div>
            <p style={{ margin: 0, fontSize: "11px", opacity: 0.7 }}>Price/Unit</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{fmt(summary?.pricePerUnit || 1000)}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "11px", opacity: 0.7 }}>Min Required</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{fmt(summary?.minimumRequired || 10000)}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "11px", opacity: 0.7 }}>Status</p>
            <p style={{ margin: 0, fontWeight: 600, color: summary?.meetsMinimumCapital ? GREEN : ORANGE }}>
              {summary?.meetsMinimumCapital ? "✅ Qualified" : "⚠️ Pending"}
            </p>
          </div>
        </div>

        {summary && !summary.meetsMinimumCapital && (
          <div style={{
            background: "rgba(255,255,255,0.1)", borderRadius: "8px",
            padding: "10px 12px", marginTop: "1rem"
          }}>
            <p style={{ margin: 0, fontSize: "12px", opacity: 0.9 }}>
              ⚠️ You need <strong>{fmt(summary.shortfall)}</strong> more to meet minimum share capital.
              Buy <strong>{Math.ceil(summary.shortfall / summary.pricePerUnit)} more share(s)</strong> to qualify for loans.
            </p>
          </div>
        )}
      </div>

      {/* Buy Shares Button */}
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
          {showForm ? "✕ Cancel" : "+ Buy Shares"}
        </button>
      </div>

      {/* Buy Form */}
      {showForm && (
        <div style={{
          background: "white", borderRadius: "12px",
          padding: "1.5rem", marginBottom: "1rem",
          boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
          borderTop: `3px solid ${BLACK}`
        }}>
          <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 1rem", fontSize: "15px" }}>
            Buy Shares
          </p>

          <form onSubmit={handleBuy}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={labelStyle}>Number of Units</label>
                <input
                  type="number"
                  min="1"
                  value={form.units}
                  onChange={e => setForm({ ...form, units: e.target.value })}
                  placeholder="e.g. 10"
                  required
                  style={inputStyle}
                />
                {form.units && (
                  <p style={{ fontSize: "12px", color: GREEN, margin: "4px 0 0" }}>
                    Total: {fmt(Number(form.units) * 1000)}
                  </p>
                )}
              </div>
              <div>
                <label style={labelStyle}>Channel</label>
                <select
                  value={form.channel}
                  onChange={e => setForm({ ...form, channel: e.target.value })}
                  style={inputStyle}
                >
                  <option value="MPESA">M-Pesa</option>
                  <option value="BANK">Bank</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>
                Reference{" "}
                <span style={{ color: "#999", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                value={form.reference}
                onChange={e => setForm({ ...form, reference: e.target.value })}
                placeholder="e.g. M-Pesa code"
                style={inputStyle}
              />
            </div>

            <div style={{
              background: "#f8f9fa", borderRadius: "8px",
              padding: "10px 12px", marginBottom: "1rem",
              border: "1px solid #eee"
            }}>
              <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
                📋 1 share = KES 1,000 • Minimum 10 shares to qualify for loans
              </p>
            </div>

            <button
              type="submit"
              disabled={buying}
              style={{
                background: buying ? "#888" : GREEN,
                color: "white", border: "none", borderRadius: "8px",
                padding: "10px 24px", fontWeight: 600, fontSize: "14px",
                cursor: buying ? "not-allowed" : "pointer"
              }}
            >
              {buying ? "Processing..." : "Buy Shares"}
            </button>
          </form>
        </div>
      )}

      {/* Share History */}
      <div style={{
        background: "white", borderRadius: "12px",
        padding: "1.5rem", boxShadow: "0 1px 6px rgba(0,0,0,0.07)"
      }}>
        <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 1rem", fontSize: "15px" }}>
          Share Purchase History
        </p>

        {history.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", padding: "2rem 0" }}>
            No share purchases yet
          </p>
        ) : (
          <div>
            {history.map((s, i) => (
              <div key={s.id} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "12px 0",
                borderBottom: i < history.length - 1 ? "1px solid #f0f0f0" : "none"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "50%",
                    background: `${BLACK}12`,
                    display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: "18px"
                  }}>
                    📊
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "13px", color: BLACK }}>
                      {s.units} share{s.units > 1 ? "s" : ""} purchased
                    </p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>
                      {new Date(s.createdAt).toLocaleDateString("en-KE", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                      {s.reference ? ` • ${s.reference}` : ""}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: BLACK }}>
                    {fmt(s.totalAmount)}
                  </p>
                  <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>
                    @ {fmt(s.pricePerUnit)}/unit
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}