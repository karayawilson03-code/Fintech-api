import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  getAdminDashboard,
  getAllMembers,
  updateMemberStatus,
} from "./admin.service";
import { success, error } from "../../utils/response";

export const dashboard = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getAdminDashboard();
    return success(res, result, "Admin dashboard loaded");
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const listMembers = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getAllMembers();
    return success(res, result, "Members retrieved");
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const updateStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
      return error(res, "Status must be ACTIVE, INACTIVE or SUSPENDED", 400);
    }

    const result = await updateMemberStatus(id, status);
    return success(res, result, `Member ${status.toLowerCase()} successfully`);
  } catch (err: any) {
    return error(res, err.message);
  }
};

import {
  getAllLoans,
  updateLoanStatus,
  getAllSavings,
  getAllShares,
  getAllPenalties,
  markPenaltyPaid,
  getAllTransactions,
} from "./admin.service";

// ── LOANS ─────────────────────────────────────────────────────────────────
export const listLoans = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getAllLoans();
    return success(res, result, "Loans retrieved");
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const updateLoan = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, disbursedAt, dueDate } = req.body;
    const validStatuses = [
      "APPROVED",
      "REJECTED",
      "DISBURSED",
      "COMPLETED",
      "DEFAULTED",
    ];
    if (!validStatuses.includes(status)) {
      return error(
        res,
        `Status must be one of: ${validStatuses.join(", ")}`,
        400,
      );
    }
    const result = await updateLoanStatus(
      id,
      status,
      disbursedAt ? new Date(disbursedAt) : undefined,
      dueDate ? new Date(dueDate) : undefined,
    );
    return success(res, result, `Loan ${status.toLowerCase()} successfully`);
  } catch (err: any) {
    return error(res, err.message);
  }
};

// ── SAVINGS ───────────────────────────────────────────────────────────────
export const listSavings = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getAllSavings();
    return success(res, result, "Savings retrieved");
  } catch (err: any) {
    return error(res, err.message);
  }
};

// ── SHARES ────────────────────────────────────────────────────────────────
export const listShares = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getAllShares();
    return success(res, result, "Shares retrieved");
  } catch (err: any) {
    return error(res, err.message);
  }
};

// ── PENALTIES ─────────────────────────────────────────────────────────────
export const listPenalties = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getAllPenalties();
    return success(res, result, "Penalties retrieved");
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const payPenalty = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await markPenaltyPaid(id);
    return success(res, result, "Penalty marked as paid");
  } catch (err: any) {
    return error(res, err.message);
  }
};

// ── TRANSACTIONS ──────────────────────────────────────────────────────────
export const listTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getAllTransactions();
    return success(res, result, "Transactions retrieved");
  } catch (err: any) {
    return error(res, err.message);
  }
};
