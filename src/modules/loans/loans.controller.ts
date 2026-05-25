import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  applyForLoan,
  getLoanById,
  getMemberLoans,
  approveLoan,
  rejectLoan,
  disburseLoan,
  repayLoan,
} from "./loans.service";
import { success, error } from "../../utils/response";

export const apply = async (req: AuthRequest, res: Response) => {
  try {
    const { product, amount, months, purpose, guarantorIds = [] } = req.body;

    if (!product || !amount || !months || !purpose) {
      return error(
        res,
        "Product, amount, months and purpose are required",
        400,
      );
    }

    const result = await applyForLoan({
      memberId: req.memberId!,
      product,
      amount: Number(amount),
      months: Number(months),
      purpose,
      guarantorIds,
    });

    return success(res, result, result.message, 201);
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const getMyLoans = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getMemberLoans(req.memberId!);
    return success(res, result, "Loans retrieved");
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const getLoan = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getLoanById(req.params.id);
    return success(res, result, "Loan retrieved");
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const approve = async (req: AuthRequest, res: Response) => {
  try {
    const result = await approveLoan(req.params.id);
    return success(res, result, "Loan approved successfully");
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const reject = async (req: AuthRequest, res: Response) => {
  try {
    const result = await rejectLoan(req.params.id);
    return success(res, result, "Loan rejected");
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const disburse = async (req: AuthRequest, res: Response) => {
  try {
    const result = await disburseLoan(req.params.id);
    return success(res, result, "Loan disbursed successfully");
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const repay = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, channel, reference } = req.body;

    if (!amount || !channel) {
      return error(res, "Amount and channel are required", 400);
    }

    const result = await repayLoan({
      loanId: req.params.id,
      amount: Number(amount),
      channel,
      reference,
    });

    return success(res, result, result.message);
  } catch (err: any) {
    return error(res, err.message);
  }
};
