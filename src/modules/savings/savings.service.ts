import prisma from "../../config/database";
import { SACCO_CONFIG } from "../../config/sacco.config";

export const depositSavings = async (data: {
  memberId: string;
  amount: number;
  channel: "CASH" | "MPESA" | "BANK";
  reference?: string;
}) => {
  const { memberId, amount, channel, reference } = data;

  // Validate minimum contribution
  if (amount < SACCO_CONFIG.minimumMonthlyContributionKes) {
    throw new Error(
      `Minimum deposit is KES ${SACCO_CONFIG.minimumMonthlyContributionKes}`,
    );
  }

  // Check member exists
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });
  if (!member) throw new Error("Member not found");

  // Get current balance
  const lastSaving = await prisma.saving.findFirst({
    where: { memberId },
    orderBy: { createdAt: "desc" },
  });

  const currentBalance = lastSaving ? lastSaving.balance : 0;
  const newBalance = currentBalance + amount;

  // Record saving and transaction together
  const [saving] = await prisma.$transaction([
    prisma.saving.create({
      data: {
        memberId,
        amount,
        balance: newBalance,
        type: "DEPOSIT",
        channel,
        reference: reference ?? null,
      },
    }),
    prisma.transaction.create({
      data: {
        memberId,
        amount,
        type: "SAVINGS_DEPOSIT",
        channel,
        reference: reference ?? null,
        description: `Savings deposit via ${channel}`,
        status: "SUCCESS",
      },
    }),
  ]);

  return {
    saving,
    currentBalance: newBalance,
    message: `KES ${amount.toLocaleString()} deposited successfully`,
  };
};

export const getSavingsBalance = async (memberId: string) => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });
  if (!member) throw new Error("Member not found");

  const lastSaving = await prisma.saving.findFirst({
    where: { memberId },
    orderBy: { createdAt: "desc" },
  });

  const balance = lastSaving ? lastSaving.balance : 0;

  // Count monthly contributions
  const contributions = await prisma.saving.count({
    where: { memberId, type: "DEPOSIT" },
  });

  return {
    memberNumber: member.memberNumber,
    firstName: member.firstName,
    lastName: member.lastName,
    balance,
    totalContributions: contributions,
    minimumMonthlyContribution: SACCO_CONFIG.minimumMonthlyContributionKes,
  };
};

export const getSavingsHistory = async (memberId: string) => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });
  if (!member) throw new Error("Member not found");

  const history = await prisma.saving.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
  });

  return history;
};

export const calculateAndCreditInterest = async (memberId: string) => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });
  if (!member) throw new Error("Member not found");

  const year = new Date().getFullYear();

  // Check if interest already credited this year
  const alreadyCredited = await prisma.saving.findFirst({
    where: {
      memberId,
      type: "INTEREST",
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      },
    },
  });

  if (alreadyCredited) {
    throw new Error(`Interest for ${year} already credited`);
  }

  const lastSaving = await prisma.saving.findFirst({
    where: { memberId },
    orderBy: { createdAt: "desc" },
  });

  const currentBalance = lastSaving ? lastSaving.balance : 0;
  if (currentBalance === 0)
    throw new Error("No savings balance to credit interest on");

  const interestAmount =
    (currentBalance * SACCO_CONFIG.annualSavingsInterestPercent) / 100;
  const newBalance = currentBalance + interestAmount;

  const [saving] = await prisma.$transaction([
    prisma.saving.create({
      data: {
        memberId,
        amount: interestAmount,
        balance: newBalance,
        type: "INTEREST",
        channel: "CASH",
      },
    }),
    prisma.transaction.create({
      data: {
        memberId,
        amount: interestAmount,
        type: "SAVINGS_DEPOSIT",
        channel: "CASH",
        description: `Annual savings interest ${year} at ${SACCO_CONFIG.annualSavingsInterestPercent}%`,
        status: "SUCCESS",
      },
    }),
  ]);

  return {
    year,
    openingBalance: currentBalance,
    interestRate: `${SACCO_CONFIG.annualSavingsInterestPercent}%`,
    interestEarned: interestAmount,
    closingBalance: newBalance,
  };
};
