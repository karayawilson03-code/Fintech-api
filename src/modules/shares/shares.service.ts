import prisma from "../../config/database";
import { SACCO_CONFIG } from "../../config/sacco.config";

export const purchaseShares = async (data: {
  memberId: string;
  units: number;
  channel: "CASH" | "MPESA" | "BANK";
  reference?: string;
}) => {
  const { memberId, units, channel, reference } = data;

  if (units < 10) throw new Error("Minimum 10 shares per purchase");

  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });
  if (!member) throw new Error("Member not found");

  const pricePerUnit = SACCO_CONFIG.shareValueKes;
  const totalAmount = units * pricePerUnit;

  const [share] = await prisma.$transaction([
    prisma.share.create({
      data: {
        memberId,
        units,
        pricePerUnit,
        totalAmount,
        type: "PURCHASE",
        reference: reference ?? null,
      },
    }),
    prisma.transaction.create({
      data: {
        memberId,
        amount: totalAmount,
        type: "SHARE_PURCHASE",
        channel,
        reference: reference ?? null,
        description: `Purchase of ${units} share(s) at KES ${pricePerUnit} each`,
        status: "SUCCESS",
      },
    }),
  ]);

  // Get updated share summary
  const summary = await getShareSummary(memberId);

  return {
    share,
    summary,
    message: `${units} share(s) purchased for KES ${totalAmount.toLocaleString()}`,
  };
};

export const getShareSummary = async (memberId: string) => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });
  if (!member) throw new Error("Member not found");

  const shares = await prisma.share.findMany({
    where: { memberId },
  });

  const totalUnits = shares.reduce((sum, s) => sum + s.units, 0);
  const totalValue = totalUnits * SACCO_CONFIG.shareValueKes;
  const meetsMinimum = totalValue >= SACCO_CONFIG.minimumShareCapitalKes;

  return {
    memberNumber: member.memberNumber,
    firstName: member.firstName,
    lastName: member.lastName,
    totalUnits,
    pricePerUnit: SACCO_CONFIG.shareValueKes,
    totalValue,
    minimumShareCapital: SACCO_CONFIG.minimumShareCapitalKes,
    minimumShares: SACCO_CONFIG.minimumShares,
    meetsMinimumCapital: meetsMinimum,
    shortfall: meetsMinimum
      ? 0
      : SACCO_CONFIG.minimumShareCapitalKes - totalValue,
  };
};
export const getShareHistory = async (memberId: string) => {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });
  if (!member) throw new Error("Member not found");

  const history = await prisma.share.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
  });

  return history;
};
