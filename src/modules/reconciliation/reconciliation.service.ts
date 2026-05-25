import prisma from "../../config/database";
import fs from "fs";
import csv from "csv-parser";

interface CSVRow {
  date: string;
  reference: string;
  description: string;
  amount: string;
  balance: string;
}

interface ReconciliationResult {
  totalRecords: number;
  matched: number;
  unmatched: number;
  totalAmount: number;
  matchedAmount: number;
  unmatchedAmount: number;
  matchedRows: any[];
  unmatchedRows: any[];
}

const parseMemberNumber = (reference: string): string | null => {
  // Extract member number from reference e.g. "HYR-2026-0001" or "0001"
  const full = reference.match(/HYR-\d{4}-\d{4}/i);
  if (full) return full[0].toUpperCase();

  // Try just the number part e.g. "0001"
  const partial = reference.match(/\d{4}/);
  if (partial) return `HYR-${new Date().getFullYear()}-${partial[0]}`;

  return null;
};

export const processCSV = async (
  filePath: string,
  uploadedBy: string,
): Promise<ReconciliationResult> => {
  const rows: CSVRow[] = [];

  // Read CSV file
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row: CSVRow) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  // Clean up uploaded file
  fs.unlinkSync(filePath);

  const matchedRows: any[] = [];
  const unmatchedRows: any[] = [];
  let matchedAmount = 0;
  let unmatchedAmount = 0;

  for (const row of rows) {
    const amount = parseFloat(row.amount?.replace(/,/g, "") || "0");
    const reference = row.reference?.trim() || "";
    const description = row.description?.trim() || "";
    const date = row.date?.trim() || "";

    if (!amount || amount <= 0) continue;

    // Try to find member from reference
    const memberNumber =
      parseMemberNumber(reference) || parseMemberNumber(description);

    if (!memberNumber) {
      unmatchedRows.push({
        date,
        reference,
        description,
        amount,
        reason: "No member number found in reference",
      });
      unmatchedAmount += amount;
      continue;
    }

    // Find member in database
    const member = await prisma.member.findUnique({
      where: { memberNumber },
    });

    if (!member) {
      unmatchedRows.push({
        date,
        reference,
        description,
        amount,
        memberNumber,
        reason: `Member ${memberNumber} not found in system`,
      });
      unmatchedAmount += amount;
      continue;
    }

    // Check for duplicate reference
    const duplicate = await prisma.saving.findFirst({
      where: { reference },
    });

    if (duplicate) {
      unmatchedRows.push({
        date,
        reference,
        description,
        amount,
        memberNumber,
        reason: "Duplicate — already processed",
      });
      unmatchedAmount += amount;
      continue;
    }

    // Get current balance
    const lastSaving = await prisma.saving.findFirst({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
    });

    const currentBalance = lastSaving ? lastSaving.balance : 0;
    const newBalance = currentBalance + amount;

    // Credit member savings
    await prisma.$transaction([
      prisma.saving.create({
        data: {
          memberId: member.id,
          amount,
          balance: newBalance,
          type: "DEPOSIT",
          channel: "BANK",
          reference,
        },
      }),
      prisma.transaction.create({
        data: {
          memberId: member.id,
          amount,
          type: "SAVINGS_DEPOSIT",
          channel: "BANK",
          reference,
          description: `Bank deposit via CSV reconciliation — ${date}`,
          status: "SUCCESS",
        },
      }),
    ]);

    matchedRows.push({
      date,
      reference,
      memberNumber,
      memberName: `${member.firstName} ${member.lastName}`,
      amount,
      newBalance,
    });

    matchedAmount += amount;
  }

  return {
    totalRecords: rows.length,
    matched: matchedRows.length,
    unmatched: unmatchedRows.length,
    totalAmount: matchedAmount + unmatchedAmount,
    matchedAmount,
    unmatchedAmount,
    matchedRows,
    unmatchedRows,
  };
};

export const getUnmatchedDeposits = async () => {
  // Return transactions flagged as unmatched
  return await prisma.transaction.findMany({
    where: { status: "FAILED" },
    orderBy: { createdAt: "desc" },
  });
};

export const manuallyMatchDeposit = async (data: {
  memberId: string;
  amount: number;
  reference: string;
  date: string;
}) => {
  const member = await prisma.member.findUnique({
    where: { id: data.memberId },
  });
  if (!member) throw new Error("Member not found");

  const lastSaving = await prisma.saving.findFirst({
    where: { memberId: data.memberId },
    orderBy: { createdAt: "desc" },
  });

  const currentBalance = lastSaving ? lastSaving.balance : 0;
  const newBalance = currentBalance + data.amount;

  await prisma.$transaction([
    prisma.saving.create({
      data: {
        memberId: data.memberId,
        amount: data.amount,
        balance: newBalance,
        type: "DEPOSIT",
        channel: "BANK",
        reference: data.reference,
      },
    }),
    prisma.transaction.create({
      data: {
        memberId: data.memberId,
        amount: data.amount,
        type: "SAVINGS_DEPOSIT",
        channel: "BANK",
        reference: data.reference,
        description: `Manually matched bank deposit — ${data.date}`,
        status: "SUCCESS",
      },
    }),
  ]);

  return {
    memberNumber: member.memberNumber,
    memberName: `${member.firstName} ${member.lastName}`,
    amount: data.amount,
    newBalance,
    message: "Deposit manually matched successfully",
  };
};
