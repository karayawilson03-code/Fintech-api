import prisma from "../../config/database";
import { SACCO_CONFIG } from "../../config/sacco.config";

export const getAdminDashboard = async () => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  // ── MEMBERS ───────────────────────────────────────────────────────────────
  const totalMembers = await prisma.member.count();
  const activeMembers = await prisma.member.count({
    where: { status: "ACTIVE" },
  });
  const newThisMonth = await prisma.member.count({
    where: { createdAt: { gte: monthStart } },
  });
  const suspendedMembers = await prisma.member.count({
    where: { status: "SUSPENDED" },
  });

  // Members who haven't contributed this month
  const contributedThisMonth = await prisma.saving.findMany({
    where: {
      type: "DEPOSIT",
      createdAt: { gte: monthStart },
    },
    distinct: ["memberId"],
    select: { memberId: true },
  });
  const notContributedCount = activeMembers - contributedThisMonth.length;

  // ── SAVINGS ───────────────────────────────────────────────────────────────
  const totalSavingsAgg = await prisma.saving.aggregate({
    where: { type: "DEPOSIT" },
    _sum: { amount: true },
  });

  const thisMonthSavingsAgg = await prisma.saving.aggregate({
    where: {
      type: "DEPOSIT",
      createdAt: { gte: monthStart },
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const thisYearSavingsAgg = await prisma.saving.aggregate({
    where: {
      type: "DEPOSIT",
      createdAt: { gte: yearStart },
    },
    _sum: { amount: true },
  });

  // ── SHARES ────────────────────────────────────────────────────────────────
  const totalSharesAgg = await prisma.share.aggregate({
    _sum: { totalAmount: true, units: true },
  });

  const membersWithMinShares = await prisma.share.groupBy({
    by: ["memberId"],
    _sum: { totalAmount: true },
    having: {
      totalAmount: { _sum: { gte: SACCO_CONFIG.minimumShareCapitalKes } },
    },
  });

  // ── LOANS ─────────────────────────────────────────────────────────────────
  const totalLoans = await prisma.loan.count();
  const pendingLoans = await prisma.loan.count({
    where: { status: "PENDING" },
  });
  const approvedLoans = await prisma.loan.count({
    where: { status: "APPROVED" },
  });
  const activeLoans = await prisma.loan.count({
    where: { status: "DISBURSED" },
  });
  const completedLoans = await prisma.loan.count({
    where: { status: "COMPLETED" },
  });
  const defaultedLoans = await prisma.loan.count({
    where: { status: "DEFAULTED" },
  });
  const rejectedLoans = await prisma.loan.count({
    where: { status: "REJECTED" },
  });

  const totalDisbursed = await prisma.loan.aggregate({
    where: { status: { in: ["DISBURSED", "COMPLETED"] } },
    _sum: { amount: true },
  });

  const totalOutstanding = await prisma.loan.aggregate({
    where: { status: "DISBURSED" },
    _sum: { balance: true },
  });

  const totalRepaid = await prisma.repayment.aggregate({
    _sum: { amount: true },
  });

  const thisMonthRepayments = await prisma.repayment.aggregate({
    where: { createdAt: { gte: monthStart } },
    _sum: { amount: true },
  });

  // Loans disbursed this month
  const thisMonthLoans = await prisma.loan.aggregate({
    where: {
      status: { in: ["DISBURSED", "COMPLETED"] },
      disbursedAt: { gte: monthStart },
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  // Pending loans waiting approval
  const pendingLoanDetails = await prisma.loan.findMany({
    where: { status: "PENDING" },
    include: {
      member: {
        select: { memberNumber: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // ── LOAN PORTFOLIO HEALTH ─────────────────────────────────────────────────
  const portfolioHealth =
    totalLoans > 0
      ? {
          performing: `${Math.round(((activeLoans + completedLoans) / totalLoans) * 100)}%`,
          nonPerforming: `${Math.round((defaultedLoans / totalLoans) * 100)}%`,
          defaultRate: `${Math.round((defaultedLoans / totalLoans) * 100)}%`,
        }
      : {
          performing: "0%",
          nonPerforming: "0%",
          defaultRate: "0%",
        };

  // ── TRANSACTIONS ──────────────────────────────────────────────────────────
  const totalTransactions = await prisma.transaction.count();
  const recentTransactions = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      member: {
        select: { memberNumber: true, firstName: true, lastName: true },
      },
    },
  });

  // ── TOP SAVERS THIS MONTH ─────────────────────────────────────────────────
  const topSavers = await prisma.saving.groupBy({
    by: ["memberId"],
    where: { type: "DEPOSIT", createdAt: { gte: monthStart } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 5,
  });

  const topSaversWithNames = await Promise.all(
    topSavers.map(async (s) => {
      const member = await prisma.member.findUnique({
        where: { id: s.memberId },
        select: { memberNumber: true, firstName: true, lastName: true },
      });
      return {
        member,
        amountSaved: s._sum.amount,
      };
    }),
  );

  // ── REVENUE (SACCO INCOME) ─────────────────────────────────────────────────
  // Interest income = sum of all interest charged on loans
  const totalInterestIncome = await prisma.loan.aggregate({
    where: { status: { in: ["DISBURSED", "COMPLETED"] } },
    _sum: { interestRate: true },
  });

  const totalProcessingFees = await prisma.loan.findMany({
    where: { status: { in: ["DISBURSED", "COMPLETED"] } },
    select: { amount: true },
  });

  const processingFeeIncome = totalProcessingFees.reduce(
    (sum, l) => sum + (l.amount * SACCO_CONFIG.processingFeePercent) / 100,
    0,
  );

  const insuranceFeeIncome = totalProcessingFees.reduce(
    (sum, l) => sum + (l.amount * SACCO_CONFIG.insuranceFeePercent) / 100,
    0,
  );

  // ── ASSEMBLE DASHBOARD ────────────────────────────────────────────────────
  return {
    overview: {
      saccoName: SACCO_CONFIG.name,
      location: SACCO_CONFIG.location,
      reportDate: now,
      reportPeriod: `${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`,
    },

    members: {
      total: totalMembers,
      active: activeMembers,
      suspended: suspendedMembers,
      newThisMonth,
      notContributedThisMonth: notContributedCount,
      withMinimumShares: membersWithMinShares.length,
    },

    savings: {
      totalAllTime: totalSavingsAgg._sum.amount || 0,
      thisMonth: thisMonthSavingsAgg._sum.amount || 0,
      thisMonthCount: thisMonthSavingsAgg._count.id || 0,
      thisYear: thisYearSavingsAgg._sum.amount || 0,
      minimumMonthly: SACCO_CONFIG.minimumMonthlyContributionKes,
    },

    shares: {
      totalUnits: totalSharesAgg._sum.units || 0,
      totalValue: totalSharesAgg._sum.totalAmount || 0,
      pricePerUnit: SACCO_CONFIG.shareValueKes,
      membersQualified: membersWithMinShares.length,
    },

    loans: {
      total: totalLoans,
      pending: pendingLoans,
      approved: approvedLoans,
      active: activeLoans,
      completed: completedLoans,
      defaulted: defaultedLoans,
      rejected: rejectedLoans,
      totalDisbursed: totalDisbursed._sum.amount || 0,
      totalOutstanding: totalOutstanding._sum.balance || 0,
      totalRepaid: totalRepaid._sum.amount || 0,
      thisMonth: {
        disbursed: thisMonthLoans._sum.amount || 0,
        count: thisMonthLoans._count.id || 0,
        repaid: thisMonthRepayments._sum.amount || 0,
      },
      portfolioHealth,
      pendingApprovals: pendingLoanDetails.map((l) => ({
        loanId: l.id,
        member: l.member,
        amount: l.amount,
        product: l.loanProduct,
        purpose: l.purpose,
        appliedAt: l.createdAt,
      })),
    },

    revenue: {
      processingFees: processingFeeIncome,
      insuranceFees: insuranceFeeIncome,
      totalFees: processingFeeIncome + insuranceFeeIncome,
    },

    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      member: t.member,
      amount: t.amount,
      type: t.type,
      channel: t.channel,
      status: t.status,
      date: t.createdAt,
    })),

    topSaversThisMonth: topSaversWithNames,

    totalTransactions,
  };
};

export const getAllMembers = async () => {
  return await prisma.member.findMany({
    select: {
      id: true,
      memberNumber: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      joinedAt: true,
    },
    orderBy: { memberNumber: "asc" },
  });
};

export const updateMemberStatus = async (
  memberId: string,
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED",
) => {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw new Error("Member not found");

  return await prisma.member.update({
    where: { id: memberId },
    data: { status },
  });
};
