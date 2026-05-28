import { useEffect, useState } from "react";
import { getMyLoans, applyLoan, repayLoan } from "../api/loans";
import axios from "axios";
import { GREEN, RED, ORANGE, BLACK } from "../constants/colors";

interface Loan {
  id: string;
  loanProduct: string;
  amount: number;
  balance: number;
  interestRate: number;
  status: string;
  purpose: string;
  disbursedAt: string | null;
  dueDate: string | null;
  createdAt: string;
  repayments: {
    id: string;
    amount: number;
    channel: string;
    reference: string;
    createdAt: string;
  }[];
  guarantors: {
    id: string;
    guarantorId: string;
    status: string;
    guaranteedAmount: number;
  }[];
}

const statusColor = (status: string) => {
  switch (status) {
    case "PENDING":   return ORANGE;
    case "APPROVED":  return "#2196F3";
    case "DISBURSED": return GREEN;
    case "COMPLETED": return "#9C27B0";
    case "REJECTED":  return RED;
    case "DEFAULTED": return RED;
    default:          return "#888";
  }
};

const productLabel = (product: string) => {
  switch (product) {
    case "normal":      return "Normal Loan";
    case "emergency":   return "Emergency Loan";
    case "schoolFees":  return "School Fees Loan";
    case "development": return "Development Loan";
    case "topUp":       return "Top-Up Loan";
    case "super":       return "Super Loan";
    default:            return product;
  }
};

export default function Loans() {
  const [loans, setLoans]         = useState<Loan[]>([]);
  const [loading, setLoading]     = useState(true);
  const [applying, setApplying]   = useState(false);
  const [repaying, setRepaying]   = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [showRepay, setShowRepay] = useState<string | null>(null);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [expanded, setExpanded]   = useState<string | null>(null);

  const [applyForm, setApplyForm] = useState({
    product:      "emergency",
    amount:       "",
    months:       "",
    purpose:      "",
    guarantorIds: [] as string[],
  });

  const [repayForm, setRepayForm] = useState({
    amount:    "",
    channel:   "MPESA",
    reference: "",
  });

  // ✅ Used by handleApply and handleRepay after actions — safe to call setState synchronously
  const load = async () => {
    try {
      const res = await getMyLoans();
      setLoans(res.data.data);
    } catch (err) {
      if (axios.isAxiosError(err))
        setError(err.response?.data?.message || "Failed to load loans");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Initial load — async IIFE avoids synchronous setState in effect body
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getMyLoans();
        if (!cancelled) {
          setLoans(res.data.data);
          setError("");
        }
      } catch (err) {
        if (!cancelled && axios.isAxiosError(err))
          setError(err.response?.data?.message || "Failed to load loans");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
   
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplying(true);
    setError("");
    setSuccess("");
    try {
      await applyLoan({
        product:      applyForm.product,
        amount:       Number(applyForm.amount),
        months:       Number(applyForm.months),
        purpose:      applyForm.purpose,
        guarantorIds: applyForm.guarantorIds,
      });
      setSuccess("Loan application submitted successfully!");
      setShowApply(false);
      setApplyForm({ product: "emergency", amount: "", months: "", purpose: "", guarantorIds: [] });
      load();
    } catch (err) {
      if (axios.isAxiosError(err))
        setError(err.response?.data?.message || "Application failed");
    } finally {
      setApplying(false);
    }
  };

  const handleRepay = async (e: React.FormEvent, loanId: string) => {
    e.preventDefault();
    setRepaying(true);
    setError("");
    setSuccess("");
    try {
      await repayLoan(loanId, {
        amount:    Number(repayForm.amount),
        channel:   repayForm.channel,
        reference: repayForm.reference || undefined,
      });
      setSuccess(`KES ${Number(repayForm.amount).toLocaleString()} repaid successfully!`);
      setShowRepay(null);
      setRepayForm({ amount: "", channel: "MPESA", reference: "" });
      load();
    } catch (err) {
      if (axios.isAxiosError(err))
        setError(err.response?.data?.message || "Repayment failed");
    } finally {
      setRepaying(false);
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
        <p style={{ color: GREEN, marginTop: "1rem" }}>Loading loans...</p>
      </div>
    </div>
  );

  const activeLoan = loans.find(l =>
    ["PENDING", "APPROVED", "DISBURSED"].includes(l.status)
  );

  return (
    <div>

      {/* Success */}
      {success && (
        <div style={{ background: "#f0faf5", border: `1px solid ${GREEN}`, borderRadius: "8px", padding: "12px 16px", marginBottom: "1rem", color: GREEN, fontWeight: 600 }}>
          ✅ {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: "#fef2f2", border: `1px solid ${RED}`, borderRadius: "8px", padding: "12px 16px", marginBottom: "1rem", color: RED }}>
          ❌ {error}
        </div>
      )}

      {/* Active Loan Banner */}
      {activeLoan && (
        <div style={{
          background: `linear-gradient(135deg, ${BLACK}, #333)`,
          borderRadius: "12px", padding: "1.5rem",
          marginBottom: "1rem", color: "white",
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "12px", opacity: 0.7, textTransform: "uppercase" }}>
                Active Loan
              </p>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>
                {fmt(activeLoan.balance)}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "12px", opacity: 0.7 }}>
                Remaining balance
              </p>
            </div>
            <span style={{
              background: statusColor(activeLoan.status),
              color: "white", padding: "4px 12px",
              borderRadius: "20px", fontSize: "11px", fontWeight: 600
            }}>
              {activeLoan.status}
            </span>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            gap: "1rem", borderTop: "1px solid rgba(255,255,255,0.15)",
            paddingTop: "1rem"
          }}>
            <div>
              <p style={{ margin: 0, fontSize: "11px", opacity: 0.7 }}>Product</p>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "13px", textTransform: "capitalize" }}>
                {productLabel(activeLoan.loanProduct)}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "11px", opacity: 0.7 }}>Interest</p>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "13px" }}>
                {activeLoan.interestRate}% / month
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "11px", opacity: 0.7 }}>Due Date</p>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "13px" }}>
                {activeLoan.dueDate
                  ? new Date(activeLoan.dueDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>

          {activeLoan.status === "DISBURSED" && (
            <div style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "11px", opacity: 0.7 }}>Repayment Progress</span>
                <span style={{ fontSize: "11px", opacity: 0.7 }}>
                  {fmt(activeLoan.repayments.reduce((s, r) => s + r.amount, 0))} paid
                </span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "4px", height: "6px" }}>
                <div style={{
                  background: GREEN, height: "100%", borderRadius: "4px",
                  width: `${Math.min(100, (activeLoan.repayments.reduce((s, r) => s + r.amount, 0) / activeLoan.amount) * 100)}%`
                }} />
              </div>
            </div>
          )}

          {activeLoan.status === "DISBURSED" && (
            <button
              onClick={() => setShowRepay(showRepay === activeLoan.id ? null : activeLoan.id)}
              style={{
                marginTop: "1rem", background: GREEN, color: "white",
                border: "none", borderRadius: "8px", padding: "9px 20px",
                fontWeight: 600, fontSize: "13px", cursor: "pointer"
              }}
            >
              {showRepay === activeLoan.id ? "✕ Cancel" : "💳 Make Repayment"}
            </button>
          )}
        </div>
      )}

      {/* Repay Form */}
      {showRepay && activeLoan && (
        <div style={{
          background: "white", borderRadius: "12px",
          padding: "1.5rem", marginBottom: "1rem",
          boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
          borderTop: `3px solid ${GREEN}`
        }}>
          <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 1rem", fontSize: "15px" }}>
            Make Repayment
          </p>
          <form onSubmit={e => handleRepay(e, activeLoan.id)}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={labelStyle}>Amount (KES)</label>
                <input
                  type="number"
                  value={repayForm.amount}
                  onChange={e => setRepayForm({ ...repayForm, amount: e.target.value })}
                  placeholder="Enter amount"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Channel</label>
                <select
                  value={repayForm.channel}
                  onChange={e => setRepayForm({ ...repayForm, channel: e.target.value })}
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
                Reference <span style={{ color: "#999", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                value={repayForm.reference}
                onChange={e => setRepayForm({ ...repayForm, reference: e.target.value })}
                placeholder="e.g. M-Pesa code"
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              disabled={repaying}
              style={{
                background: repaying ? "#888" : GREEN,
                color: "white", border: "none", borderRadius: "8px",
                padding: "10px 24px", fontWeight: 600, fontSize: "14px",
                cursor: repaying ? "not-allowed" : "pointer"
              }}
            >
              {repaying ? "Processing..." : "Submit Repayment"}
            </button>
          </form>
        </div>
      )}

      {/* Apply Button */}
      {!activeLoan && (
        <div style={{ marginBottom: "1rem" }}>
          <button
            onClick={() => setShowApply(!showApply)}
            style={{
              background: showApply ? "#888" : BLACK,
              color: "white", border: "none", borderRadius: "8px",
              padding: "10px 20px", fontWeight: 600, fontSize: "14px",
              cursor: "pointer"
            }}
          >
            {showApply ? "✕ Cancel" : "+ Apply for Loan"}
          </button>
        </div>
      )}

      {/* Apply Form */}
      {showApply && (
        <div style={{
          background: "white", borderRadius: "12px",
          padding: "1.5rem", marginBottom: "1rem",
          boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
          borderTop: `3px solid ${ORANGE}`
        }}>
          <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 1rem", fontSize: "15px" }}>
            Loan Application
          </p>
          <form onSubmit={handleApply}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={labelStyle}>Loan Product</label>
                <select
                  value={applyForm.product}
                  onChange={e => setApplyForm({ ...applyForm, product: e.target.value })}
                  style={inputStyle}
                >
                  <option value="emergency">Emergency Loan</option>
                  <option value="normal">Normal Loan</option>
                  <option value="schoolFees">School Fees Loan</option>
                  <option value="development">Development Loan</option>
                  <option value="topUp">Top-Up Loan</option>
                  <option value="super">Super Loan</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Amount (KES)</label>
                <input
                  type="number"
                  value={applyForm.amount}
                  onChange={e => setApplyForm({ ...applyForm, amount: e.target.value })}
                  placeholder="Enter amount"
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={labelStyle}>Repayment Period (months)</label>
                <input
                  type="number"
                  value={applyForm.months}
                  onChange={e => setApplyForm({ ...applyForm, months: e.target.value })}
                  placeholder="e.g. 6"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Guarantor Member ID{" "}
                  <span style={{ color: "#999", fontWeight: 400 }}>(if required)</span>
                </label>
                <input
                  value={applyForm.guarantorIds[0] || ""}
                  onChange={e => setApplyForm({
                    ...applyForm,
                    guarantorIds: e.target.value ? [e.target.value] : []
                  })}
                  placeholder="Guarantor member ID"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>Purpose</label>
              <textarea
                value={applyForm.purpose}
                onChange={e => setApplyForm({ ...applyForm, purpose: e.target.value })}
                placeholder="Briefly describe why you need this loan"
                required
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <div style={{
              background: "#f8f9fa", borderRadius: "8px",
              padding: "12px", marginBottom: "1rem", border: "1px solid #eee"
            }}>
              <p style={{ fontSize: "12px", color: "#666", margin: 0, fontWeight: 600 }}>
                📋 Loan Charges
              </p>
              <p style={{ fontSize: "12px", color: "#888", margin: "4px 0 0" }}>
                Interest: 3% per month • Processing fee: 0.5% • Insurance: 2.5%
              </p>
            </div>

            <button
              type="submit"
              disabled={applying}
              style={{
                background: applying ? "#888" : ORANGE,
                color: "white", border: "none", borderRadius: "8px",
                padding: "10px 24px", fontWeight: 600, fontSize: "14px",
                cursor: applying ? "not-allowed" : "pointer"
              }}
            >
              {applying ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        </div>
      )}

      {/* Loan History */}
      <div style={{
        background: "white", borderRadius: "12px",
        padding: "1.5rem", boxShadow: "0 1px 6px rgba(0,0,0,0.07)"
      }}>
        <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 1rem", fontSize: "15px" }}>
          Loan History
        </p>

        {loans.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", padding: "2rem 0" }}>
            No loans yet
          </p>
        ) : (
          <div>
            {loans.map((loan, i) => (
              <div key={loan.id}>
                <div
                  onClick={() => setExpanded(expanded === loan.id ? null : loan.id)}
                  style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "12px 0",
                    borderBottom: expanded === loan.id ? "none" : i < loans.length - 1 ? "1px solid #f0f0f0" : "none",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "50%",
                      background: `${statusColor(loan.status)}18`,
                      display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "18px"
                    }}>
                      🏦
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: "13px", color: BLACK }}>
                        {productLabel(loan.loanProduct)}
                      </p>
                      <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>
                        {new Date(loan.createdAt).toLocaleDateString("en-KE", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: BLACK }}>
                      {fmt(loan.amount)}
                    </p>
                    <span style={{
                      background: `${statusColor(loan.status)}20`,
                      color: statusColor(loan.status),
                      fontSize: "10px", padding: "2px 8px",
                      borderRadius: "10px", fontWeight: 600
                    }}>
                      {loan.status}
                    </span>
                  </div>
                </div>

                {expanded === loan.id && (
                  <div style={{
                    background: "#f8f9fa", borderRadius: "8px",
                    padding: "12px", marginBottom: "8px"
                  }}>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#555", margin: "0 0 8px", textTransform: "uppercase" }}>
                      Repayments ({loan.repayments.length})
                    </p>
                    {loan.repayments.length === 0 ? (
                      <p style={{ fontSize: "12px", color: "#aaa", margin: 0 }}>No repayments yet</p>
                    ) : (
                      loan.repayments.map(r => (
                        <div key={r.id} style={{
                          display: "flex", justifyContent: "space-between",
                          padding: "6px 0", borderBottom: "1px solid #eee"
                        }}>
                          <div>
                            <p style={{ margin: 0, fontSize: "12px", color: BLACK, fontWeight: 600 }}>
                              {fmt(r.amount)}
                            </p>
                            <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>
                              {r.channel} {r.reference ? `• ${r.reference}` : ""}
                            </p>
                          </div>
                          <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>
                            {new Date(r.createdAt).toLocaleDateString("en-KE")}
                          </p>
                        </div>
                      ))
                    )}
                    <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #ddd" }}>
                      <p style={{ fontSize: "12px", color: "#555", margin: 0 }}>
                        Purpose: {loan.purpose}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}