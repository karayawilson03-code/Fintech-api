import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  depositSavings,
  getSavingsBalance,
  getSavingsHistory,
  calculateAndCreditInterest,
} from "./savings.service";
import { success, error } from "../../utils/response";

export const deposit = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, channel, reference } = req.body;
    const memberId = req.memberId!;

    if (!amount || !channel) {
      return error(res, "Amount and channel are required", 400);
    }

    if (!["CASH", "MPESA", "BANK"].includes(channel)) {
      return error(res, "Channel must be CASH, MPESA or BANK", 400);
    }

    const result = await depositSavings({
      memberId,
      amount,
      channel,
      reference,
    });
    return success(res, result, result.message, 201);
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const getBalance = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getSavingsBalance(req.memberId!);
    return success(res, result, "Savings balance retrieved");
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const getHistory = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getSavingsHistory(req.memberId!);
    return success(res, result, "Savings history retrieved");
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const creditInterest = async (req: AuthRequest, res: Response) => {
  try {
    const result = await calculateAndCreditInterest(req.memberId!);
    return success(res, result, "Interest credited successfully");
  } catch (err: any) {
    return error(res, err.message);
  }
};
