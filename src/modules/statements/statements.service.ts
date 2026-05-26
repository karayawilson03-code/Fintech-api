import prisma from "../../config/database";
import { SACCO_CONFIG } from "../../config/sacco.config";

export const getMemberStatement = async (
  memberId: string,
  fromDate?: string,
  toDate?: string,
) => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { nextOfKin: true },
  });
  if (!member) throw new Error("Member not found");

  const from = fromDate
    ? new Date(fromDate)
    : new Date(new Date().getFullYear(), 0, 1);
  const to = toDate ? new Date(toDate) : new Date();

  // ── SAVINGS TRANSACTIONS ──────────────────────────────────────────────────
  const savingsTransactions = await prisma.saving.findMany({
    where: {
      memberId,
      createdAt: { gte: from, lte: to },
    },
    orderBy: { createdAt: "asc" },
  });

  // Opening savings balance
  const openingSaving = await prisma.saving.findFirst({
    where: { memberId, createdAt: { lt: from } },
    orderBy: { createdAt: "desc" },
  });
  const openingSavingsBalance = openingSaving ? openingSaving.balance : 0;

  // Closing savings balance
  const closingSaving = await prisma.saving.findFirst({
    where: { memberId },
    orderBy: { createdAt: "desc" },
  });
  const closingSavingsBalance = closingSaving ? closingSaving.balance : 0;

  // Savings summary
  const totalDeposits = savingsTransactions
    .filter((t) => t.type === "DEPOSIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = savingsTransactions
    .filter((t) => t.type === "WITHDRAWAL")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalInterest = savingsTransactions
    .filter((t) => t.type === "INTEREST")
    .reduce((sum, t) => sum + t.amount, 0);

  // ── SHARE TRANSACTIONS ────────────────────────────────────────────────────
  const shareTransactions = await prisma.share.findMany({
    where: {
      memberId,
      createdAt: { gte: from, lte: to },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalSharesPurchased = shareTransactions.reduce(
    (sum, s) => sum + s.totalAmount,
    0,
  );

  const totalShareUnits = await prisma.share.aggregate({
    where: { memberId },
    _sum: { units: true },
  });

  // ── LOAN TRANSACTIONS ─────────────────────────────────────────────────────
  const loans = await prisma.loan.findMany({
    where: {
      memberId,
      createdAt: { gte: from, lte: to },
    },
    include: {
      repayments: {
        where: { createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: "asc" },
      },
      penalties: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const activeLoan = await prisma.loan.findFirst({
    where: { memberId, status: { in: ["DISBURSED", "APPROVED"] } },
    include: { repayments: true },
  });

  const totalLoansDisbursed = loans
    .filter((l) => ["DISBURSED", "COMPLETED"].includes(l.status))
    .reduce((sum, l) => sum + l.amount, 0);

  const totalRepayments = loans
    .flatMap((l) => l.repayments)
    .reduce((sum, r) => sum + r.amount, 0);

  // ── GUARANTOR ACTIVITY ────────────────────────────────────────────────────
  const guarantorActivity = await prisma.loanGuarantor.findMany({
    where: {
      guarantorId: memberId,
      createdAt: { gte: from, lte: to },
    },
    include: {
      loan: {
        include: {
          member: {
            select: {
              memberNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  // ── FINANCIAL SUMMARY ─────────────────────────────────────────────────────
  const saccoNetWorth =
    closingSavingsBalance +
    (totalShareUnits._sum.units || 0) * SACCO_CONFIG.shareValueKes;

  // ── ASSEMBLE STATEMENT ────────────────────────────────────────────────────
  return {
    statement: {
      generatedAt: new Date(),
      period: {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
      },
      sacco: {
        name: SACCO_CONFIG.name,
        location: SACCO_CONFIG.location,
      },
    },

    member: {
      memberNumber: member.memberNumber,
      fullName: `${member.firstName} ${member.lastName}`,
      email: member.email,
      phone: member.phone,
      employer: member.employer,
      memberSince: member.joinedAt,
      nextOfKin: member.nextOfKin
        ? `${member.nextOfKin.fullName} (${member.nextOfKin.relationship})`
        : null,
    },

    savings: {
      openingBalance: openingSavingsBalance,
      closingBalance: closingSavingsBalance,
      totalDeposits,
      totalWithdrawals,
      totalInterest,
      minimumMonthly: SACCO_CONFIG.minimumMonthlyContributionKes,
      transactions: savingsTransactions.map((t) => ({
        date: t.createdAt,
        type: t.type,
        amount: t.amount,
        balance: t.balance,
        channel: t.channel,
        reference: t.reference,
      })),
    },

    shares: {
      totalUnits: totalShareUnits._sum.units || 0,
      totalValue:
        (totalShareUnits._sum.units || 0) * SACCO_CONFIG.shareValueKes,
      pricePerUnit: SACCO_CONFIG.shareValueKes,
      minimumRequired: SACCO_CONFIG.minimumShareCapitalKes,
      totalPurchased: totalSharesPurchased,
      transactions: shareTransactions.map((s) => ({
        date: s.createdAt,
        type: s.type,
        units: s.units,
        pricePerUnit: s.pricePerUnit,
        totalAmount: s.totalAmount,
        reference: s.reference,
      })),
    },

    loans: {
      totalDisbursed: totalLoansDisbursed,
      totalRepaid: totalRepayments,
      activeLoan: activeLoan
        ? {
            loanId: activeLoan.id,
            product: activeLoan.loanProduct,
            amount: activeLoan.amount,
            balance: activeLoan.balance,
            interestRate: `${activeLoan.interestRate}% per month`,
            status: activeLoan.status,
            disbursedAt: activeLoan.disbursedAt,
            dueDate: activeLoan.dueDate,
            totalRepaid: activeLoan.repayments.reduce(
              (sum, r) => sum + r.amount,
              0,
            ),
            remainingBalance: activeLoan.balance,
          }
        : null,
      loanHistory: loans.map((l) => ({
        loanId: l.id,
        product: l.loanProduct,
        amount: l.amount,
        status: l.status,
        purpose: l.purpose,
        disbursedAt: l.disbursedAt,
        dueDate: l.dueDate,
        repayments: l.repayments.map((r) => ({
          date: r.createdAt,
          amount: r.amount,
          channel: r.channel,
          reference: r.reference,
        })),
        penalties: l.penalties.map((p) => ({
          amount: p.amount,
          reason: p.reason,
          isPaid: p.isPaid,
          createdAt: p.createdAt,
        })),
      })),
    },

    guarantorActivity: guarantorActivity.map((g) => ({
      borrower: `${g.loan.member.firstName} ${g.loan.member.lastName}`,
      memberNumber: g.loan.member.memberNumber,
      loanAmount: g.loan.amount,
      guaranteedAmount: g.guaranteedAmount,
      status: g.status,
      loanStatus: g.loan.status,
      date: g.createdAt,
    })),

    summary: {
      saccoNetWorth,
      totalSavings: closingSavingsBalance,
      totalShares:
        (totalShareUnits._sum.units || 0) * SACCO_CONFIG.shareValueKes,
      totalLoansRepaid: totalRepayments,
      activeLoanBalance: activeLoan ? activeLoan.balance : 0,
    },
  };
};
