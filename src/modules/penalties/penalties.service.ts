import prisma from "../../config/database";
import { SACCO_CONFIG } from "../../config/sacco.config";

const PENALTY_RATE = 0.05; // 5% of monthly installment — TODO: confirm with chairman

export const calculatePenalties = async () => {
  const now = new Date();

  // Get all active disbursed loans
  const activeLoans = await prisma.loan.findMany({
    where: { status: "DISBURSED" },
    include: { repayments: true, penalties: true },
  });

  const penaltiesCreated = [];
  const loansChecked = activeLoans.length;

  for (const loan of activeLoans) {
    if (!loan.dueDate) continue;

    const dueDate = new Date(loan.dueDate);
    const isOverdue = now > dueDate;

    if (!isOverdue) continue;

    // Calculate how many months overdue
    const monthsOverdue = Math.floor(
      (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
    );

    if (monthsOverdue <= 0) continue;

    // Check if penalty already charged this month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const alreadyCharged = await prisma.penalty.findFirst({
      where: {
        loanId: loan.id,
        createdAt: { gte: thisMonthStart },
      },
    });

    if (alreadyCharged) continue;

    // Calculate penalty amount
    const monthlyInstallment = Math.round(loan.balance / 3);
    const penaltyAmount = Math.round(monthlyInstallment * PENALTY_RATE);

    if (penaltyAmount <= 0) continue;

    // Create penalty
    const penalty = await prisma.penalty.create({
      data: {
        loanId: loan.id,
        amount: penaltyAmount,
        reason: `Late repayment penalty — ${monthsOverdue} month(s) overdue`,
        isPaid: false,
      },
    });

    // Update loan balance
    await prisma.loan.update({
      where: { id: loan.id },
      data: { balance: loan.balance + penaltyAmount },
    });

    penaltiesCreated.push({
      loanId: loan.id,
      memberId: loan.memberId,
      penaltyAmount,
      monthsOverdue,
      penaltyId: penalty.id,
    });
  }

  return {
    loansChecked,
    penaltiesCreated: penaltiesCreated.length,
    totalPenaltyAmount: penaltiesCreated.reduce(
      (sum, p) => sum + p.penaltyAmount,
      0,
    ),
    details: penaltiesCreated,
  };
};

export const getMemberPenalties = async (memberId: string) => {
  const loans = await prisma.loan.findMany({
    where: { memberId },
    include: {
      penalties: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const allPenalties = loans.flatMap((l) =>
    l.penalties.map((p) => ({
      penaltyId: p.id,
      loanId: l.id,
      loanProduct: l.loanProduct,
      amount: p.amount,
      reason: p.reason,
      isPaid: p.isPaid,
      createdAt: p.createdAt,
    })),
  );

  const totalUnpaid = allPenalties
    .filter((p) => !p.isPaid)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPaid = allPenalties
    .filter((p) => p.isPaid)
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    totalPenalties: allPenalties.length,
    totalUnpaid,
    totalPaid,
    penalties: allPenalties,
  };
};

export const payPenalty = async (data: {
  penaltyId: string;
  memberId: string;
  channel: "CASH" | "MPESA" | "BANK";
  reference?: string;
}) => {
  const penalty = await prisma.penalty.findUnique({
    where: { id: data.penaltyId },
    include: { loan: true },
  });

  if (!penalty) throw new Error("Penalty not found");
  if (penalty.isPaid) throw new Error("Penalty already paid");
  if (penalty.loan.memberId !== data.memberId) {
    throw new Error("This penalty does not belong to you");
  }

  await prisma.$transaction([
    prisma.penalty.update({
      where: { id: data.penaltyId },
      data: { isPaid: true },
    }),
    prisma.transaction.create({
      data: {
        memberId: data.memberId,
        amount: penalty.amount,
        type: "PENALTY_PAYMENT",
        channel: data.channel,
        reference: data.reference ?? null,
        description: `Penalty payment — ${penalty.reason}`,
        status: "SUCCESS",
      },
    }),
  ]);

  return {
    penaltyId: data.penaltyId,
    amount: penalty.amount,
    reason: penalty.reason,
    message: `Penalty of KES ${penalty.amount.toLocaleString()} paid successfully`,
  };
};

export const getAllPenalties = async () => {
  const penalties = await prisma.penalty.findMany({
    include: {
      loan: {
        include: {
          member: {
            select: {
              memberNumber: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalUnpaid = penalties
    .filter((p) => !p.isPaid)
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    total: penalties.length,
    unpaid: penalties.filter((p) => !p.isPaid).length,
    paid: penalties.filter((p) => p.isPaid).length,
    totalUnpaid,
    penalties: penalties.map((p) => ({
      penaltyId: p.id,
      member: p.loan.member,
      loanId: p.loanId,
      loanProduct: p.loan.loanProduct,
      amount: p.amount,
      reason: p.reason,
      isPaid: p.isPaid,
      createdAt: p.createdAt,
    })),
  };
};
