import { useEffect, useState } from "react";
import { getDashboard } from "../api/member";
import axios from "axios";

const RED = "#C0202A";
const GREEN = "#1A6B52";
const ORANGE = "#E8601A";
const BLACK = "#1A1A1A";
const LIGHT = "#f0f7f0";

interface DashboardData {
  profile: {
    memberNumber: string;
    fullName: string;
    email: string;
    phone: string;
    employer: string;
    role: string;
    status: string;
    memberSince: string;
  };
  savings: {
    balance: number;
    thisMonthPaid: boolean;
    totalContributions: number;
    projectedYearEndInterest: number;
    minimumMonthlyContribution: number;
  };
  shares: {
    totalUnits: number;
    totalValue: number;
    meetsMinimum: boolean;
    shortfall: number;
  };
  loans: {
    activeLoan: {
      loanId: string;
      product: string;
      principal: number;
      remainingBalance: number;
      percentPaid: string;
      monthlyInstallment: number;
      dueDate: string;
      status: string;
    } | null;
    eligibility: {
      canBorrow: boolean;
      reason: string;
      maxLoanByProduct: {
        normal: number;
        emergency: number;
        schoolFees: number;
        development: number;
        super: number;
      };
    };
  };
  financialHealth: {
    score: number;
    rating: string;
    breakdown: string[];
  };
  upcomingObligations: {
    type: string;
    amount: number;
    due: string;
    status: string;
  }[];
  summary: {
    saccoNetWorth: number;
    totalSavings: number;
    totalShares: number;
    activeLoanBalance: number;
  };
}

const card = (children: React.ReactNode, style?: React.CSSProperties) => (
  <div style={{
    background: "white", borderRadius: "10px",
    padding: "1.25rem", boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
    ...style
  }}>
    {children}
  </div>
);

const statBox = (label: string, value: string, color: string) => (
  <div style={{ textAlign: "center", padding: "0.75rem" }}>
    <p style={{ fontSize: "11px", color: "#888", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
    <p style={{ fontSize: "20px", fontWeight: 700, color, margin: "4px 0 0" }}>{value}</p>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  //const member = JSON.parse(localStorage.getItem("member") || "{}");

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getDashboard();
        setData(res.data.data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message || "Failed to load dashboard");
        }
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const fmt = (n: number) => `KES ${n.toLocaleString()}`;

  const healthColor = (rating: string) =>
    rating === "Excellent" ? GREEN :
    rating === "Good" ? "#2196F3" :
    rating === "Fair" ? ORANGE : RED;

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: LIGHT }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "40px", height: "40px", border: `4px solid ${GREEN}`, borderTop: "4px solid transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
        <p style={{ color: GREEN, marginTop: "1rem", fontWeight: 600 }}>Loading dashboard...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: LIGHT }}>
      <p style={{ color: RED }}>{error}</p>
    </div>
  );

  if (!data) return null;

  return (
    <div style={{ minHeight: "100vh", background: LIGHT }}>

      {/* Header */}
      <div style={{ background: GREEN, padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ color: "white", fontWeight: 700, fontSize: "16px", margin: 0 }}>
            Hyrax Achievers SACCO
          </p>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", margin: 0 }}>
            {data.profile.memberNumber} — {data.profile.fullName}
          </p>
        </div>

      {/* Color bar */}
      <div style={{ display: "flex", height: "6px" }}>
        <div style={{ flex: 1, background: GREEN }} />
        <div style={{ flex: 1, background: RED }} />
        <div style={{ flex: 1, background: ORANGE }} />
        <div style={{ flex: 1, background: BLACK }} />
      </div>

      <div style={{ padding: "1.25rem", maxWidth: "800px", margin: "0 auto" }}>

        {/* Net Worth Summary */}
        {card(
          <>
            <p style={{ fontSize: "12px", color: "#888", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              My SACCO Net Worth
            </p>
            <p style={{ fontSize: "28px", fontWeight: 700, color: GREEN, margin: "0 0 1rem" }}>
              {fmt(data.summary.saccoNetWorth)}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid #eee", paddingTop: "0.75rem" }}>
              {statBox("Savings", fmt(data.summary.totalSavings), GREEN)}
              {statBox("Shares", fmt(data.summary.totalShares), BLACK)}
              {statBox("Loan Balance", fmt(data.summary.activeLoanBalance), RED)}
            </div>
          </>
        , { marginBottom: "1rem" })}

        {/* Financial Health */}
        {card(
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <p style={{ fontWeight: 700, color: BLACK, margin: 0 }}>Financial Health</p>
              <span style={{ background: healthColor(data.financialHealth.rating), color: "white", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 }}>
                {data.financialHealth.rating} — {data.financialHealth.score}/100
              </span>
            </div>
            {/* Score bar */}
            <div style={{ background: "#eee", borderRadius: "4px", height: "8px", marginBottom: "0.75rem" }}>
              <div style={{ background: healthColor(data.financialHealth.rating), width: `${data.financialHealth.score}%`, height: "100%", borderRadius: "4px", transition: "width 0.5s" }} />
            </div>
            {data.financialHealth.breakdown.map((item, i) => (
              <p key={i} style={{ fontSize: "13px", color: "#555", margin: "4px 0" }}>{item}</p>
            ))}
          </>
        , { marginBottom: "1rem" })}

        {/* Savings & Shares */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>

          {/* Savings */}
          {card(
            <>
              <p style={{ fontWeight: 700, color: GREEN, margin: "0 0 0.75rem", fontSize: "14px" }}>💰 Savings</p>
              <p style={{ fontSize: "22px", fontWeight: 700, color: BLACK, margin: "0 0 4px" }}>{fmt(data.savings.balance)}</p>
              <p style={{ fontSize: "12px", color: "#888", margin: "0 0 0.75rem" }}>Current balance</p>
              <div style={{ background: data.savings.thisMonthPaid ? "#f0faf5" : "#fef2f2", borderRadius: "6px", padding: "8px 10px", marginBottom: "0.5rem" }}>
                <p style={{ fontSize: "12px", color: data.savings.thisMonthPaid ? GREEN : RED, margin: 0, fontWeight: 600 }}>
                  {data.savings.thisMonthPaid ? "✅ This month: PAID" : "❌ This month: UNPAID"}
                </p>
              </div>
              <p style={{ fontSize: "12px", color: "#888", margin: "4px 0" }}>
                Contributions: {data.savings.totalContributions}
              </p>
              <p style={{ fontSize: "12px", color: "#888", margin: "4px 0" }}>
                Projected interest: {fmt(data.savings.projectedYearEndInterest)}
              </p>
            </>
          )}

          {/* Shares */}
          {card(
            <>
              <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 0.75rem", fontSize: "14px" }}>📊 Shares</p>
              <p style={{ fontSize: "22px", fontWeight: 700, color: BLACK, margin: "0 0 4px" }}>{data.shares.totalUnits} units</p>
              <p style={{ fontSize: "12px", color: "#888", margin: "0 0 0.75rem" }}>{fmt(data.shares.totalValue)} total value</p>
              <div style={{ background: data.shares.meetsMinimum ? "#f0faf5" : "#fef2f2", borderRadius: "6px", padding: "8px 10px", marginBottom: "0.5rem" }}>
                <p style={{ fontSize: "12px", color: data.shares.meetsMinimum ? GREEN : RED, margin: 0, fontWeight: 600 }}>
                  {data.shares.meetsMinimum ? "✅ Meets minimum" : `❌ Shortfall: ${fmt(data.shares.shortfall)}`}
                </p>
              </div>
              <p style={{ fontSize: "12px", color: "#888", margin: "4px 0" }}>
                Min required: KES 10,000
              </p>
              <p style={{ fontSize: "12px", color: "#888", margin: "4px 0" }}>
                Price per unit: KES 1,000
              </p>
            </>
          )}
        </div>

        {/* Active Loan */}
        {card(
          <>
            <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 0.75rem", fontSize: "14px" }}>🏦 Loan</p>
            {data.loans.activeLoan ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "13px", color: "#555", textTransform: "capitalize" }}>
                    {data.loans.activeLoan.product} loan
                  </span>
                  <span style={{ background: ORANGE, color: "white", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 600 }}>
                    {data.loans.activeLoan.status}
                  </span>
                </div>
                <p style={{ fontSize: "22px", fontWeight: 700, color: RED, margin: "0 0 4px" }}>
                  {fmt(data.loans.activeLoan.remainingBalance)}
                </p>
                <p style={{ fontSize: "12px", color: "#888", margin: "0 0 0.75rem" }}>Remaining balance</p>
                {/* Progress bar */}
                <div style={{ background: "#eee", borderRadius: "4px", height: "8px", marginBottom: "6px" }}>
                  <div style={{ background: GREEN, width: data.loans.activeLoan.percentPaid, height: "100%", borderRadius: "4px" }} />
                </div>
                <p style={{ fontSize: "12px", color: GREEN, margin: "0 0 0.5rem" }}>{data.loans.activeLoan.percentPaid} repaid</p>
                <p style={{ fontSize: "12px", color: "#888", margin: "4px 0" }}>
                  Monthly installment: {fmt(data.loans.activeLoan.monthlyInstallment)}
                </p>
                <p style={{ fontSize: "12px", color: "#888", margin: "4px 0" }}>
                  Due: {new Date(data.loans.activeLoan.dueDate).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </>
            ) : (
              <>
                <p style={{ color: "#888", fontSize: "13px", margin: "0 0 0.75rem" }}>No active loan</p>
                <div style={{ background: data.loans.eligibility.canBorrow ? "#f0faf5" : "#fef2f2", borderRadius: "6px", padding: "8px 10px" }}>
                  <p style={{ fontSize: "12px", color: data.loans.eligibility.canBorrow ? GREEN : RED, margin: 0, fontWeight: 600 }}>
                    {data.loans.eligibility.canBorrow ? "✅ Eligible to borrow" : `❌ ${data.loans.eligibility.reason}`}
                  </p>
                </div>
                {data.loans.eligibility.canBorrow && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <p style={{ fontSize: "12px", color: "#888", margin: "0 0 4px", fontWeight: 600 }}>Max loan available:</p>
                    <p style={{ fontSize: "12px", color: "#555", margin: "2px 0" }}>Normal: {fmt(data.loans.eligibility.maxLoanByProduct.normal)}</p>
                    <p style={{ fontSize: "12px", color: "#555", margin: "2px 0" }}>Emergency: {fmt(data.loans.eligibility.maxLoanByProduct.emergency)}</p>
                    <p style={{ fontSize: "12px", color: "#555", margin: "2px 0" }}>School fees: {fmt(data.loans.eligibility.maxLoanByProduct.schoolFees)}</p>
                  </div>
                )}
              </>
            )}
          </>
        , { marginBottom: "1rem" })}

        {/* Upcoming Obligations */}
        {card(
          <>
            <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 0.75rem", fontSize: "14px" }}>📅 Upcoming Obligations</p>
            {data.upcomingObligations.map((ob, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < data.upcomingObligations.length - 1 ? "1px solid #eee" : "none" }}>
                <div>
                  <p style={{ fontSize: "13px", color: BLACK, fontWeight: 600, margin: 0 }}>{ob.type}</p>
                  <p style={{ fontSize: "11px", color: "#888", margin: 0 }}>{ob.due}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: BLACK, margin: 0 }}>{fmt(ob.amount)}</p>
                  <span style={{ background: ob.status === "PAID" ? GREEN : ORANGE, color: "white", padding: "1px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: 600 }}>
                    {ob.status}
                  </span>
                </div>
              </div>
            ))}
          </>
        , { marginBottom: "1rem" })}

        {/* Member Info */}
        {card(
          <>
            <p style={{ fontWeight: 700, color: BLACK, margin: "0 0 0.75rem", fontSize: "14px" }}>👤 Member Info</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                ["Member No.", data.profile.memberNumber],
                ["Status", data.profile.status],
                ["Phone", data.profile.phone],
                ["Employer", data.profile.employer || "—"],
                ["Member Since", new Date(data.profile.memberSince).toLocaleDateString("en-KE")],
                ["Role", data.profile.role],
              ].map(([label, value]) => (
                <div key={label}>
                  <p style={{ fontSize: "11px", color: "#888", margin: 0, textTransform: "uppercase" }}>{label}</p>
                  <p style={{ fontSize: "13px", color: BLACK, fontWeight: 600, margin: "2px 0 0" }}>{value}</p>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
 </div> );
}