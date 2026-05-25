import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { getMemberDashboard } from "./members.service";
import { success, error } from "../../utils/response";

export const dashboard = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getMemberDashboard(req.memberId!);
    return success(res, result, "Dashboard loaded successfully");
  } catch (err: any) {
    return error(res, err.message);
  }
};
