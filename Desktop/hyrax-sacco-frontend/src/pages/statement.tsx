import { useEffect, useState } from "react";
import { getStatement } from "../api/member";
import axios from "axios";
import { GREEN, RED, ORANGE, BLACK } from "../constants/colors";

interface Statement {
  statement: {
    generatedAt: string;
    period: { from: string; to: string };
    sacco: { name: string; location: string };
  };
  member: {
    memberNumber: string;
    fullName: string;
    email: string;
    phone: string;
    employer: string;
    memberSince: string;
    nextOfKin: string;
  };
  savings: {
    openingBalance: number;
    closingBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalInterest: number;
    minimumMonthly: number;
    transactions: {
      date: string;
      type: string;
      amount: number;
      balance: number;
      channel: string;
      reference: string | null;
    }[];
  };
  shares: {
    totalUnits: number;
    totalValue: number;
    pricePerUnit: number;
    minimumRequired: number;
    totalPurchased: number;
    transactions: {
      date: string;
      type: string;
      units: number;
      pricePerUnit: number;
      totalAmount: number;
      reference: string | null;
    }[];
  };
  loans: {
    totalDisbursed: number;
    totalRepaid: number;
    activeLoan: {
      loanId: string;
      product: string;
      amount: number;
      balance: number;
      interestRate: string;
      status: string;
      disbursedAt: string;
      dueDate: string;
      totalRepaid: number;
      remainingBalance: number;
    } | null;
    loanHistory: {
      loanId: string;
      product: string;
      amount: number;
      status: string;
      purpose: string;
      disbursedAt: string | null;
      dueDate: string | null;
      repayments: {
        date: string;
        amount: number;
        channel: string;
        reference: string | null;
      }[];
    }[];
  };
  guarantorActivity: {
    borrower: string;
    memberNumber: string;
    loanAmount: number;
    guaranteedAmount: number;
    status: string;
    loanStatus: string;
    date: string;
  }[];
  summary: {
    saccoNetWorth: number;
    totalSavings: number;
    totalShares: number;
    totalLoansRepaid: number;
    activeLoanBalance: number;
  };
}

export default function Statement() {
  const [data, setData]           = useState<Statement | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [from, setFrom]           = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo]               = useState(new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState<"overview" | "savings" | "loans" | "shares" | "guarantors">("overview");

  // ✅ Used by Generate button — safe to call setState synchronously here
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getStatement(from, to);
      setData(res.data.data);
    } catch (err) {
      if (axios.isAxiosError(err))
        setError(err.response?.data?.message || "Failed to load statement");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Initial load — async IIFE pattern avoids synchronous setState in effect body
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getStatement(from, to);
        if (!cancelled) {
          setData(res.data.data);
          setError("");
        }
      } catch (err) {
        if (!cancelled && axios.isAxiosError(err))
          setError(err.response?.data?.message || "Failed to load statement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (n: number) => `KES ${n.toLocaleString()}`;

  const fmtDt = (d: string) =>
    new Date(d).toLocaleDateString("en-KE", {
      day: "numeric", month: "short", year: "numeric",
    });

  const typeColor = (t: string) =>
    t === "DEPOSIT" ? GREEN : t === "WITHDRAWAL" ? RED : "#9C27B0";

  const statusColor = (s: string) => {
    switch (s) {
      case "PENDING":   return ORANGE;
      case "APPROVED":  return "#2196F3";
      case "DISBURSED": return GREEN;
      case "COMPLETED": return "#9C27B0";
      case "REJECTED":  return RED;
      default:          return "#888";
    }
  };

  const tabs = [
    { key: "overview",   label: "Overview"   },
    { key: "savings",    label: "Savings"    },
    { key: "loans",      label: "Loans"      },
    { key: "shares",     label: "Shares"     },
    { key: "guarantors", label: "Guarantors" },
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
        <p style={{ color: GREEN, marginTop: "1rem" }}>Generating statement...</p>
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

  if (!data) return null;

  return (
    <div>

      {/* Date Filter */}
      <div style={{
        background: "white", borderRadius: "12px",
        padding: "1.25rem", marginBottom: "1rem",
        boxShadow: "0 1px 6px rgba(0,0,0,0.07)"
      }}>
        <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 0.75rem", fontSize: "14px" }}>
          📅 Statement Period
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px", alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: "12px", color: GREEN, fontWeight: 600 }}>From</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              style={{
                width: "100%", padding: "8px 12px", marginTop: "4px",
                borderRadius: "6px", border: "1.5px solid #ddd",
                fontSize: "14px", boxSizing: "border-box", color: BLACK
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", color: GREEN, fontWeight: 600 }}>To</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              style={{
                width: "100%", padding: "8px 12px", marginTop: "4px",
                borderRadius: "6px", border: "1.5px solid #ddd",
                fontSize: "14px", boxSizing: "border-box", color: BLACK
              }}
            />
          </div>
          <button
            onClick={load}
            style={{
              background: GREEN, color: "white", border: "none",
              borderRadius: "6px", padding: "9px 16px",
              fontWeight: 600, fontSize: "13px", cursor: "pointer"
            }}
          >
            Generate
          </button>
        </div>
        <p style={{ fontSize: "11px", color: "#888", margin: "8px 0 0" }}>
          Generated: {fmtDt(data.statement.generatedAt)} •
          Period: {data.statement.period.from} to {data.statement.period.to}
        </p>
      </div>

      {/* Member Info */}
      <div style={{
        background: `linear-gradient(135deg, ${GREEN}, #0d5c14)`,
        borderRadius: "12px", padding: "1.25rem",
        marginBottom: "1rem", color: "white"
      }}>
        <p style={{ margin: "0 0 4px", fontSize: "13px", opacity: 0.8 }}>
          {data.statement.sacco.name} • {data.statement.sacco.location}
        </p>
        <p style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700 }}>
          {data.member.fullName}
        </p>
        <p style={{ margin: "0 0 0.75rem", fontSize: "13px", opacity: 0.8 }}>
          {data.member.memberNumber} • Member since {fmtDt(data.member.memberSince)}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>📞 {data.member.phone}</p>
          <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>✉️ {data.member.email}</p>
          {data.member.employer && (
            <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>🏢 {data.member.employer}</p>
          )}
          {data.member.nextOfKin && (
            <p style={{ margin: 0, fontSize: "12px", opacity: 0.8 }}>👤 {data.member.nextOfKin}</p>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "1rem", marginBottom: "1rem"
      }}>
        {[
          { label: "SACCO Net Worth",    value: fmt(data.summary.saccoNetWorth),    color: GREEN       },
          { label: "Total Savings",      value: fmt(data.summary.totalSavings),     color: GREEN       },
          { label: "Share Capital",      value: fmt(data.summary.totalShares),      color: BLACK       },
          { label: "Active Loan Bal.",   value: fmt(data.summary.activeLoanBalance),color: RED         },
          { label: "Total Loans Repaid", value: fmt(data.summary.totalLoansRepaid), color: "#2196F3"   },
          { label: "Total Disbursed",    value: fmt(data.loans.totalDisbursed),     color: ORANGE      },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: "white", borderRadius: "10px",
            padding: "1rem", boxShadow: "0 1px 6px rgba(0,0,0,0.07)"
          }}>
            <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#888", textTransform: "uppercase" }}>
              {label}
            </p>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{
        background: "white", borderRadius: "12px",
        boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden"
      }}>
        <div style={{ display: "flex", borderBottom: "1px solid #eee", overflowX: "auto" }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              style={{
                padding: "12px 16px", border: "none", background: "none",
                cursor: "pointer", fontSize: "13px", fontWeight: 600,
                color: activeTab === tab.key ? GREEN : "#888",
                borderBottom: activeTab === tab.key ? `2px solid ${GREEN}` : "2px solid transparent",
                whiteSpace: "nowrap"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "1.25rem" }}>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div>
              <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 1rem" }}>Period Summary</p>
              {[
                { label: "Opening Savings Balance", value: fmt(data.savings.openingBalance)    },
                { label: "Total Deposits",          value: fmt(data.savings.totalDeposits)     },
                { label: "Total Withdrawals",       value: fmt(data.savings.totalWithdrawals)  },
                { label: "Interest Earned",         value: fmt(data.savings.totalInterest)     },
                { label: "Closing Savings Balance", value: fmt(data.savings.closingBalance), bold: true },
                { label: "Share Capital",           value: fmt(data.shares.totalValue)         },
                { label: "Loans Disbursed",         value: fmt(data.loans.totalDisbursed)      },
                { label: "Loans Repaid",            value: fmt(data.loans.totalRepaid)         },
              ].map(({ label, value, bold }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "10px 0", borderBottom: "1px solid #f5f5f5"
                }}>
                  <p style={{ margin: 0, fontSize: "13px", color: "#555" }}>{label}</p>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: bold ? 700 : 600, color: BLACK }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Savings Tab */}
          {activeTab === "savings" && (
            <div>
              <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 1rem" }}>
                Savings Transactions ({data.savings.transactions.length})
              </p>
              {data.savings.transactions.length === 0 ? (
                <p style={{ color: "#888", textAlign: "center", padding: "2rem 0" }}>
                  No savings transactions in this period
                </p>
              ) : (
                data.savings.transactions.map((t, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 0",
                    borderBottom: i < data.savings.transactions.length - 1 ? "1px solid #f5f5f5" : "none"
                  }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: "13px", color: typeColor(t.type) }}>
                        {t.type}
                      </p>
                      <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>
                        {fmtDt(t.date)} • {t.channel}{t.reference ? ` • ${t.reference}` : ""}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "13px", color: typeColor(t.type) }}>
                        {t.type === "WITHDRAWAL" ? "-" : "+"}{fmt(t.amount)}
                      </p>
                      <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>
                        Bal: {fmt(t.balance)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Loans Tab */}
          {activeTab === "loans" && (
            <div>
              {data.loans.activeLoan && (
                <div style={{
                  background: "#f8f9fa", borderRadius: "8px",
                  padding: "12px", marginBottom: "1rem",
                  border: `1px solid ${GREEN}20`
                }}>
                  <p style={{ fontWeight: 700, color: GREEN, margin: "0 0 8px", fontSize: "13px" }}>
                    Active Loan
                  </p>
                  {[
                    { label: "Product",       value: data.loans.activeLoan.product },
                    { label: "Amount",        value: fmt(data.loans.activeLoan.amount) },
                    { label: "Balance",       value: fmt(data.loans.activeLoan.remainingBalance) },
                    { label: "Interest Rate", value: data.loans.activeLoan.interestRate },
                    { label: "Status",        value: data.loans.activeLoan.status },
                    { label: "Due Date",      value: data.loans.activeLoan.dueDate ? fmtDt(data.loans.activeLoan.dueDate) : "—" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>{label}</p>
                      <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: BLACK }}>{value}</p>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 1rem" }}>
                Loan History ({data.loans.loanHistory.length})
              </p>
              {data.loans.loanHistory.length === 0 ? (
                <p style={{ color: "#888", textAlign: "center", padding: "2rem 0" }}>
                  No loans in this period
                </p>
              ) : (
                data.loans.loanHistory.map((loan, i) => (
                  <div key={loan.loanId} style={{
                    padding: "12px 0",
                    borderBottom: i < data.loans.loanHistory.length - 1 ? "1px solid #f5f5f5" : "none"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: "13px", color: BLACK, textTransform: "capitalize" }}>
                        {loan.product} loan
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
                    <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#888" }}>
                      Amount: {fmt(loan.amount)} • Purpose: {loan.purpose}
                    </p>
                    {loan.repayments.length > 0 && (
                      <p style={{ margin: 0, fontSize: "12px", color: GREEN }}>
                        {loan.repayments.length} repayment(s) — {fmt(loan.repayments.reduce((s, r) => s + r.amount, 0))} paid
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Shares Tab */}
          {activeTab === "shares" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                {[
                  { label: "Total Units",  value: `${data.shares.totalUnits} units` },
                  { label: "Total Value",  value: fmt(data.shares.totalValue)       },
                  { label: "Price/Unit",   value: fmt(data.shares.pricePerUnit)     },
                  { label: "Min Required", value: fmt(data.shares.minimumRequired)  },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "#f8f9fa", borderRadius: "8px", padding: "10px 12px" }}>
                    <p style={{ margin: "0 0 2px", fontSize: "11px", color: "#888" }}>{label}</p>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: BLACK }}>{value}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 1rem" }}>
                Share Transactions ({data.shares.transactions.length})
              </p>
              {data.shares.transactions.length === 0 ? (
                <p style={{ color: "#888", textAlign: "center", padding: "2rem 0" }}>
                  No share transactions in this period
                </p>
              ) : (
                data.shares.transactions.map((s, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 0",
                    borderBottom: i < data.shares.transactions.length - 1 ? "1px solid #f5f5f5" : "none"
                  }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: "13px", color: BLACK }}>
                        {s.units} unit{s.units > 1 ? "s" : ""} — {s.type}
                      </p>
                      <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>
                        {fmtDt(s.date)} • {fmt(s.pricePerUnit)}/unit{s.reference ? ` • ${s.reference}` : ""}
                      </p>
                    </div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: BLACK }}>
                      {fmt(s.totalAmount)}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Guarantors Tab */}
          {activeTab === "guarantors" && (
            <div>
              <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 1rem" }}>
                Guarantor Activity ({data.guarantorActivity.length})
              </p>
              {data.guarantorActivity.length === 0 ? (
                <p style={{ color: "#888", textAlign: "center", padding: "2rem 0" }}>
                  No guarantor activity in this period
                </p>
              ) : (
                data.guarantorActivity.map((g, i) => (
                  <div key={i} style={{
                    padding: "12px 0",
                    borderBottom: i < data.guarantorActivity.length - 1 ? "1px solid #f5f5f5" : "none"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: "13px", color: BLACK }}>
                        {g.borrower}
                      </p>
                      <span style={{
                        background: g.status === "APPROVED" ? `${GREEN}20` : `${RED}20`,
                        color: g.status === "APPROVED" ? GREEN : RED,
                        fontSize: "10px", padding: "2px 8px",
                        borderRadius: "10px", fontWeight: 600
                      }}>
                        {g.status}
                      </span>
                    </div>
                    <p style={{ margin: "0 0 2px", fontSize: "12px", color: "#888" }}>
                      {g.memberNumber} • Loan: {fmt(g.loanAmount)}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                      Guaranteed: {fmt(g.guaranteedAmount)} • {fmtDt(g.date)}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}