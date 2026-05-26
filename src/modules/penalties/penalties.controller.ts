import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  calculatePenalties,
  getMemberPenalties,
  payPenalty,
  getAllPenalties,
} from "./penalties.service";
import { success, error } from "../../utils/response";

export const runPenaltyCalculation = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const result = await calculatePenalties();
    return success(
      res,
      result,
      `Penalty calculation complete — ${result.penaltiesCreated} penalties created`,
    );
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const myPenalties = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getMemberPenalties(req.memberId!);
    return success(res, result, "Penalties retrieved");
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const pay = async (req: AuthRequest, res: Response) => {
  try {
    const { penaltyId, channel, reference } = req.body;

    if (!penaltyId || !channel) {
      return error(res, "Penalty ID and channel are required", 400);
    }

    if (!["CASH", "MPESA", "BANK"].includes(channel)) {
      return error(res, "Channel must be CASH, MPESA or BANK", 400);
    }

    const result = await payPenalty({
      penaltyId,
      memberId: req.memberId!,
      channel,
      reference,
    });

    return success(res, result, result.message);
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const allPenalties = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getAllPenalties();
    return success(res, result, "All penalties retrieved");
  } catch (err: any) {
    return error(res, err.message);
  }
};
