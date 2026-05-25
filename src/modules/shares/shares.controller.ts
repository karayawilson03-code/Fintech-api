import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  purchaseShares,
  getShareSummary,
  getShareHistory,
} from "./shares.service";
import { success, error } from "../../utils/response";

export const buyShares = async (req: AuthRequest, res: Response) => {
  try {
    const { units, channel, reference } = req.body;

    if (!units || !channel) {
      return error(res, "Units and channel are required", 400);
    }

    if (!["CASH", "MPESA", "BANK"].includes(channel)) {
      return error(res, "Channel must be CASH, MPESA or BANK", 400);
    }

    if (units < 10) {
      return error(res, "Minimum 10 shares per purchase", 400);
    }

    const result = await purchaseShares({
      memberId: req.memberId!,
      units: Number(units), // ensure units is a number >= 10
      channel,
      reference,
    });

    return success(res, result, result.message, 201);
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const getSummary = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getShareSummary(req.memberId!);
    return success(res, result, "Share summary retrieved");
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const getHistory = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getShareHistory(req.memberId!);
    return success(res, result, "Share history retrieved");
  } catch (err: any) {
    return error(res, err.message);
  }
};
