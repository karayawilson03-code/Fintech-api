import prisma from "../../config/database";
import { SACCO_CONFIG } from "../../config/sacco.config";

export const getMemberDashboard = async (memberId: string) => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { nextOfKin: true },
  });
  if (!member) throw new Error("Member not found");

  // ── SAVINGS ───────────────────────────────────────────────────────────────
  const lastSaving = await prisma.saving.findFirst({
    where: { memberId },
    orderBy: { createdAt: "desc" },
  });
  const savingsBalance = lastSaving ? lastSaving.balance : 0;

  // This month contributions
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const thisMonthContribution = await prisma.saving.findFirst({
    where: {
      memberId,
      type: "DEPOSIT",
      createdAt: { gte: monthStart, lte: monthEnd },
    },
  });

  const totalContributions = await prisma.saving.aggregate({
    where: { memberId, type: "DEPOSIT" },
    _sum: { amount: true },
    _count: { id: true },
  });

  // Interest earned this year
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const interestThisYear = await prisma.saving.aggregate({
    where: {
      memberId,
      type: "INTEREST",
      createdAt: { gte: yearStart },
    },
    _sum: { amount: true },
  });

  const projectedInterest =
    (savingsBalance * SACCO_CONFIG.annualSavingsInterestPercent) / 100;

  // Recent savings transactions
  const recentSavings = await prisma.saving.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // ── SHARES ────────────────────────────────────────────────────────────────
  const shares = await prisma.share.findMany({
    where: { memberId },
  });
  const totalShareUnits = shares.reduce((sum, s) => sum + s.units, 0);
  const totalShareValue = totalShareUnits * SACCO_CONFIG.shareValueKes;
  const meetsMinCapital =
    totalShareValue >= SACCO_CONFIG.minimumShareCapitalKes;
  const shareShortfall = meetsMinCapital
    ? 0
    : SACCO_CONFIG.minimumShareCapitalKes - totalShareValue;

  // ── LOANS ─────────────────────────────────────────────────────────────────
  const activeLoan = await prisma.loan.findFirst({
    where: {
      memberId,
      status: { in: ["PENDING", "APPROVED", "DISBURSED"] },
    },
    include: { repayments: true, guarantors: true },
    orderBy: { createdAt: "desc" },
  });

  const loanHistory = await prisma.loan.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Loans I am guaranteeing
  const guaranteeing = await prisma.loanGuarantor.findMany({
    where: { guarantorId: memberId },
    include: { loan: true },
  });

  // Loan eligibility
  const maxLoanNormal = savingsBalance * 3;
  const maxLoanEmergency = Math.min(savingsBalance * 1, 50000);
  const maxLoanSchool = savingsBalance * 2;
  const maxLoanDevelop = savingsBalance * 4;
  const maxLoanSuper = savingsBalance * 5;
  const canBorrow = meetsMinCapital && !activeLoan;

  // Loan repayment progress
  let loanProgress = null;
  if (activeLoan) {
    const totalRepaid = activeLoan.repayments.reduce(
      (sum, r) => sum + r.amount,
      0,
    );
    const percentPaid = Math.round((totalRepaid / activeLoan.balance) * 100);
    const remainingBal = activeLoan.balance - totalRepaid;
    const monthlyInstall = Math.round(
      activeLoan.balance /
        (activeLoan.dueDate
          ? Math.max(
              1,
              Math.ceil(
                (new Date(activeLoan.dueDate).getTime() - now.getTime()) /
                  (1000 * 60 * 60 * 24 * 30),
              ),
            )
          : 1),
    );

    loanProgress = {
      loanId: activeLoan.id,
      product: activeLoan.loanProduct,
      principal: activeLoan.amount,
      totalRepayment: activeLoan.balance,
      totalRepaid,
      remainingBalance: remainingBal,
      percentPaid: `${percentPaid}%`,
      monthlyInstallment: monthlyInstall,
      dueDate: activeLoan.dueDate,
      status: activeLoan.status,
      guarantors: activeLoan.guarantors.length,
    };
  }

  // ── FINANCIAL HEALTH SCORE ────────────────────────────────────────────────
  let score = 0;
  const scoreBreakdown: string[] = [];

  // Savings consistency (30 points)
  if ((totalContributions._count.id || 0) >= 3) {
    score += 30;
    scoreBreakdown.push("✅ Consistent savings contributions");
  } else {
    scoreBreakdown.push("❌ Less than 3 months of contributions");
  }

  // Share capital (20 points)
  if (meetsMinCapital) {
    score += 20;
    scoreBreakdown.push("✅ Meets minimum share capital");
  } else {
    scoreBreakdown.push(
      `❌ Share capital shortfall: KES ${shareShortfall.toLocaleString()}`,
    );
  }

  // Savings balance (20 points)
  if (savingsBalance >= SACCO_CONFIG.minimumMonthlyContributionKes * 3) {
    score += 20;
    scoreBreakdown.push("✅ Good savings balance");
  } else {
    scoreBreakdown.push("❌ Low savings balance");
  }

  // Loan repayment (30 points)
  if (!activeLoan) {
    score += 30;
    scoreBreakdown.push("✅ No outstanding loans");
  } else if (activeLoan.status === "DISBURSED") {
    score += 15;
    scoreBreakdown.push("⚠️ Active loan — repaying on time adds points");
  }

  const healthRating =
    score >= 80
      ? "Excellent"
      : score >= 60
        ? "Good"
        : score >= 40
          ? "Fair"
          : "Poor";

  // ── UPCOMING OBLIGATIONS ──────────────────────────────────────────────────
  const upcomingObligations = [];

  // Monthly contribution
  if (!thisMonthContribution) {
    upcomingObligations.push({
      type: "Monthly Contribution",
      amount: SACCO_CONFIG.minimumMonthlyContributionKes,
      due: `${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`,
      status: "UNPAID",
    });
  } else {
    upcomingObligations.push({
      type: "Monthly Contribution",
      amount: thisMonthContribution.amount,
      due: `${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`,
      status: "PAID",
    });
  }

  // Loan repayment
  if (activeLoan && activeLoan.dueDate) {
    upcomingObligations.push({
      type: "Loan Repayment",
      amount: Math.round(activeLoan.balance / 3),
      due: activeLoan.dueDate,
      status: "PENDING",
    });
  }

  // ── SACCO NET WORTH ───────────────────────────────────────────────────────
  const saccoNetWorth = savingsBalance + totalShareValue;

  // ── ASSEMBLE DASHBOARD ────────────────────────────────────────────────────
  return {
    profile: {
      memberNumber: member.memberNumber,
      fullName: `${member.firstName} ${member.lastName}`,
      email: member.email,
      phone: member.phone,
      employer: member.employer,
      role: member.role,
      status: member.status,
      memberSince: member.joinedAt,
      nextOfKin: member.nextOfKin,
    },

    savings: {
      balance: savingsBalance,
      thisMonthContribution: thisMonthContribution
        ? thisMonthContribution.amount
        : 0,
      thisMonthPaid: !!thisMonthContribution,
      totalContributed: totalContributions._sum.amount || 0,
      totalContributions: totalContributions._count.id || 0,
      interestEarnedThisYear: interestThisYear._sum.amount || 0,
      projectedYearEndInterest: projectedInterest,
      minimumMonthlyContribution: SACCO_CONFIG.minimumMonthlyContributionKes,
      recentTransactions: recentSavings,
    },

    shares: {
      totalUnits: totalShareUnits,
      pricePerUnit: SACCO_CONFIG.shareValueKes,
      totalValue: totalShareValue,
      minimumRequired: SACCO_CONFIG.minimumShareCapitalKes,
      meetsMinimum: meetsMinCapital,
      shortfall: shareShortfall,
    },

    loans: {
      activeLoan: loanProgress,
      loanHistory,
      guaranteeing: guaranteeing.map((g) => ({
        loanId: g.loanId,
        guaranteedAmount: g.guaranteedAmount,
        status: g.status,
        loanStatus: g.loan.status,
      })),
      eligibility: {
        canBorrow,
        reason: !meetsMinCapital
          ? "Minimum share capital not met"
          : activeLoan
            ? "Already has an active loan"
            : "Eligible to borrow",
        maxLoanByProduct: {
          normal: maxLoanNormal,
          emergency: maxLoanEmergency,
          schoolFees: maxLoanSchool,
          development: maxLoanDevelop,
          super: maxLoanSuper,
        },
      },
    },

    financialHealth: {
      score,
      rating: healthRating,
      breakdown: scoreBreakdown,
    },

    upcomingObligations,

    summary: {
      saccoNetWorth,
      totalSavings: savingsBalance,
      totalShares: totalShareValue,
      activeLoanBalance: activeLoan ? activeLoan.balance : 0,
    },
  };
};
