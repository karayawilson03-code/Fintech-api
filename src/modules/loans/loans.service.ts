import prisma from "../../config/database";
import { SACCO_CONFIG } from "../../config/sacco.config";

const getLoanProductConfig = (product: string) => {
  const products = SACCO_CONFIG.loanProducts as any;
  if (!products[product]) throw new Error(`Invalid loan product: ${product}`);
  return products[product];
};

const getSavingsBalance = async (memberId: string): Promise<number> => {
  const last = await prisma.saving.findFirst({
    where: { memberId },
    orderBy: { createdAt: "desc" },
  });
  return last ? last.balance : 0;
};

const getTotalShares = async (memberId: string): Promise<number> => {
  const shares = await prisma.share.findMany({ where: { memberId } });
  return shares.reduce((sum, s) => sum + s.totalAmount, 0);
};

export const applyForLoan = async (data: {
  memberId: string;
  product: string;
  amount: number;
  months: number;
  purpose: string;
  guarantorIds: string[];
}) => {
  const { memberId, product, amount, months, purpose, guarantorIds } = data;

  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });
  if (!member) throw new Error("Member not found");

  // Check membership duration
  const joinedAt = new Date(member.joinedAt);
  const now = new Date();
  const monthsAsMember =
    (now.getFullYear() - joinedAt.getFullYear()) * 12 +
    (now.getMonth() - joinedAt.getMonth());

  // Temporarily commented out for testing
  //if (monthsAsMember < SACCO_CONFIG.minimumMembershipMonthsForLoan) {
  // throw new Error(
  // `Must be a member for at least ${SACCO_CONFIG.minimumMembershipMonthsForLoan} months before borrowing`,
  // );
  // }

  // Check share capital
  const totalShares = await getTotalShares(memberId);
  if (totalShares < SACCO_CONFIG.minimumShareCapitalKes) {
    throw new Error(
      `Minimum share capital of KES ${SACCO_CONFIG.minimumShareCapitalKes} required`,
    );
  }

  // Check no active loan
  const activeLoan = await prisma.loan.findFirst({
    where: {
      memberId,
      status: { in: ["APPROVED", "DISBURSED"] },
    },
  });
  if (activeLoan) throw new Error("You already have an active loan");

  // Get product config
  const productConfig = getLoanProductConfig(product);

  // Check term limits
  if (months < productConfig.minMonths || months > productConfig.maxMonths) {
    throw new Error(
      `${productConfig.name} term must be between ${productConfig.minMonths} and ${productConfig.maxMonths} months`,
    );
  }

  // Check loan limit based on savings
  const savingsBalance = await getSavingsBalance(memberId);
  if (productConfig.maxMultiplierOfSavings) {
    const maxLoan = savingsBalance * productConfig.maxMultiplierOfSavings;
    if (amount > maxLoan) {
      throw new Error(
        `Maximum loan for ${productConfig.name} is KES ${maxLoan.toLocaleString()} (${productConfig.maxMultiplierOfSavings}× your savings of KES ${savingsBalance.toLocaleString()})`,
      );
    }
  }

  // Check hard ceiling
  if (productConfig.maxAmountKes && amount > productConfig.maxAmountKes) {
    throw new Error(
      `Maximum amount for ${productConfig.name} is KES ${productConfig.maxAmountKes.toLocaleString()}`,
    );
  }

  // Validate guarantors
  if (productConfig.requiresGuarantor && guarantorIds.length === 0) {
    throw new Error(`${productConfig.name} requires at least one guarantor`);
  }

  // Check guarantors are valid members and not self
  for (const guarantorId of guarantorIds) {
    if (guarantorId === memberId) {
      throw new Error("You cannot guarantee your own loan");
    }
    const guarantor = await prisma.member.findUnique({
      where: { id: guarantorId },
    });
    if (!guarantor) throw new Error(`Guarantor ${guarantorId} not found`);
    if (guarantor.status !== "ACTIVE") {
      throw new Error(
        `Guarantor ${guarantor.firstName} ${guarantor.lastName} is not active`,
      );
    }
  }

  // Calculate fees
  const monthlyRate = productConfig.monthlyRatePercent;
  const interestAmount = (amount * monthlyRate * months) / 100;
  const processingFee = (amount * SACCO_CONFIG.processingFeePercent) / 100;
  const insuranceFee = (amount * SACCO_CONFIG.insuranceFeePercent) / 100;
  const totalRepayment = amount + interestAmount;
  const monthlyInstallment = totalRepayment / months;
  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + months);

  // Create loan with guarantors
  const loan = await prisma.loan.create({
    data: {
      memberId,
      loanProduct: product,
      amount,
      balance: totalRepayment,
      interestRate: monthlyRate,
      status: "PENDING",
      purpose,
      dueDate,
      guarantors: {
        create: guarantorIds.map((guarantorId) => ({
          guarantorId,
          guaranteedAmount: amount / guarantorIds.length,
          status: "PENDING",
        })),
      },
    },
    include: { guarantors: true },
  });

  return {
    loan,
    breakdown: {
      principal: amount,
      interestRate: `${monthlyRate}% per month`,
      interestAmount,
      processingFee,
      insuranceFee,
      totalFees: processingFee + insuranceFee,
      totalRepayment,
      monthlyInstallment: Math.round(monthlyInstallment),
      months,
      dueDate,
    },
    message: `Loan application for KES ${amount.toLocaleString()} submitted successfully`,
  };
};

export const getLoanById = async (loanId: string) => {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { guarantors: true, repayments: true, penalties: true },
  });
  if (!loan) throw new Error("Loan not found");
  return loan;
};

export const getMemberLoans = async (memberId: string) => {
  return await prisma.loan.findMany({
    where: { memberId },
    include: { guarantors: true, repayments: true },
    orderBy: { createdAt: "desc" },
  });
};

export const approveLoan = async (loanId: string) => {
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan) throw new Error("Loan not found");
  if (loan.status !== "PENDING")
    throw new Error("Only pending loans can be approved");

  return await prisma.loan.update({
    where: { id: loanId },
    data: { status: "APPROVED" },
  });
};

export const rejectLoan = async (loanId: string) => {
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan) throw new Error("Loan not found");
  if (loan.status !== "PENDING")
    throw new Error("Only pending loans can be rejected");

  return await prisma.loan.update({
    where: { id: loanId },
    data: { status: "REJECTED" },
  });
};

export const disburseLoan = async (loanId: string) => {
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan) throw new Error("Loan not found");
  if (loan.status !== "APPROVED")
    throw new Error("Loan must be approved before disbursement");

  return await prisma.loan.update({
    where: { id: loanId },
    data: { status: "DISBURSED", disbursedAt: new Date() },
  });
};

export const repayLoan = async (data: {
  loanId: string;
  amount: number;
  channel: "CASH" | "MPESA" | "BANK";
  reference?: string;
}) => {
  const { loanId, amount, channel, reference } = data;

  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan) throw new Error("Loan not found");

  if (!["DISBURSED", "APPROVED"].includes(loan.status)) {
    throw new Error("Cannot repay a loan that is not active");
  }

  const newBalance = loan.balance - amount;
  const loanStatus = newBalance <= 0 ? "COMPLETED" : loan.status;

  const [repayment] = await prisma.$transaction([
    prisma.repayment.create({
      data: { loanId, amount, channel, reference: reference ?? null },
    }),
    prisma.loan.update({
      where: { id: loanId },
      data: { balance: Math.max(newBalance, 0), status: loanStatus },
    }),
    prisma.transaction.create({
      data: {
        memberId: loan.memberId,
        amount,
        type: "LOAN_REPAYMENT",
        channel,
        reference: reference ?? null,
        description: `Loan repayment for loan ${loanId}`,
        status: "SUCCESS",
      },
    }),
  ]);

  return {
    repayment,
    remainingBalance: Math.max(newBalance, 0),
    loanStatus,
    message:
      newBalance <= 0
        ? "🎉 Loan fully repaid!"
        : `KES ${amount.toLocaleString()} repaid. Remaining: KES ${Math.max(newBalance, 0).toLocaleString()}`,
  };
};
