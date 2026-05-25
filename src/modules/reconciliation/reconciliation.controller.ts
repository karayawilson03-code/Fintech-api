import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { processCSV, manuallyMatchDeposit } from "./reconciliation.service";
import { success, error } from "../../utils/response";
import path from "path";

export const uploadBankStatement = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return error(res, "Please upload a CSV file", 400);
    }

    const filePath = path.join(
      __dirname,
      "../../../uploads/",
      req.file.filename,
    );

    const result = await processCSV(filePath, req.memberId!);

    return success(
      res,
      result,
      `Reconciliation complete — ${result.matched} matched, ${result.unmatched} unmatched`,
    );
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const manualMatch = async (req: AuthRequest, res: Response) => {
  try {
    const { memberId, amount, reference, date } = req.body;

    if (!memberId || !amount || !reference) {
      return error(res, "MemberId, amount and reference are required", 400);
    }

    const result = await manuallyMatchDeposit({
      memberId,
      amount: Number(amount),
      reference,
      date: date || new Date().toISOString(),
    });

    return success(res, result, result.message);
  } catch (err: any) {
    return error(res, err.message);
  }
};
