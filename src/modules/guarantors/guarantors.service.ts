import prisma from "../../config/database";

export const getMyGuarantorRequests = async (memberId: string) => {
  const requests = await prisma.loanGuarantor.findMany({
    where: { guarantorId: memberId },
    include: {
      loan: {
        include: {
          member: {
            select: {
              memberNumber: true,
              firstName: true,
              lastName: true,
              phone: true,
              employer: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((r) => ({
    guarantorRequestId: r.id,
    status: r.status,
    guaranteedAmount: r.guaranteedAmount,
    respondedAt: r.respondedAt,
    requestedAt: r.createdAt,
    loan: {
      loanId: r.loan.id,
      product: r.loan.loanProduct,
      amount: r.loan.amount,
      purpose: r.loan.purpose,
      status: r.loan.status,
      dueDate: r.loan.dueDate,
    },
    borrower: {
      memberNumber: r.loan.member.memberNumber,
      fullName: `${r.loan.member.firstName} ${r.loan.member.lastName}`,
      phone: r.loan.member.phone,
      employer: r.loan.member.employer,
    },
  }));
};

export const respondToGuarantorRequest = async (
  guarantorRequestId: string,
  guarantorId: string,
  response: "APPROVED" | "DECLINED",
) => {
  // Find the request
  const request = await prisma.loanGuarantor.findUnique({
    where: { id: guarantorRequestId },
    include: { loan: true },
  });

  if (!request) throw new Error("Guarantor request not found");

  // Make sure this is the right guarantor
  if (request.guarantorId !== guarantorId) {
    throw new Error("You are not authorized to respond to this request");
  }

  // Check already responded
  if (request.status !== "PENDING") {
    throw new Error(
      `You have already ${request.status.toLowerCase()} this request`,
    );
  }

  // Check loan is still pending
  if (request.loan.status !== "PENDING") {
    throw new Error("This loan is no longer pending — cannot respond");
  }

  // Update guarantor response
  const updated = await prisma.loanGuarantor.update({
    where: { id: guarantorRequestId },
    data: {
      status: response,
      respondedAt: new Date(),
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

  return {
    guarantorRequestId,
    response,
    guaranteedAmount: request.guaranteedAmount,
    loan: {
      loanId: request.loan.id,
      product: request.loan.loanProduct,
      amount: request.loan.amount,
      purpose: request.loan.purpose,
    },
    borrower: {
      memberNumber: updated.loan.member.memberNumber,
      fullName: `${updated.loan.member.firstName} ${updated.loan.member.lastName}`,
    },
    message:
      response === "APPROVED"
        ? `You have approved to guarantee KES ${request.guaranteedAmount.toLocaleString()} for ${updated.loan.member.firstName} ${updated.loan.member.lastName}`
        : `You have declined to guarantee this loan`,
  };
};

export const getLoanGuarantorStatus = async (loanId: string) => {
  const guarantors = await prisma.loanGuarantor.findMany({
    where: { loanId },
    include: {
      guarantor: {
        select: {
          memberNumber: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
  });

  const allApproved = guarantors.every((g) => g.status === "APPROVED");
  const anyDeclined = guarantors.some((g) => g.status === "DECLINED");
  const pendingCount = guarantors.filter((g) => g.status === "PENDING").length;

  return {
    loanId,
    totalGuarantors: guarantors.length,
    approved: guarantors.filter((g) => g.status === "APPROVED").length,
    declined: guarantors.filter((g) => g.status === "DECLINED").length,
    pending: pendingCount,
    allApproved,
    anyDeclined,
    canProceed: allApproved && !anyDeclined,
    guarantors: guarantors.map((g) => ({
      guarantorRequestId: g.id,
      memberNumber: g.guarantor.memberNumber,
      fullName: `${g.guarantor.firstName} ${g.guarantor.lastName}`,
      phone: g.guarantor.phone,
      guaranteedAmount: g.guaranteedAmount,
      status: g.status,
      respondedAt: g.respondedAt,
    })),
  };
};
