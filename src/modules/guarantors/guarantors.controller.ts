import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  getMyGuarantorRequests,
  respondToGuarantorRequest,
  getLoanGuarantorStatus,
} from "./guarantors.service";
import { success, error } from "../../utils/response";

export const myRequests = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getMyGuarantorRequests(req.memberId!);
    return success(res, result, "Guarantor requests retrieved");
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const respond = async (req: AuthRequest, res: Response) => {
  try {
    const { response } = req.body;
    const { id } = req.params;

    if (!["APPROVED", "DECLINED"].includes(response)) {
      return error(res, "Response must be APPROVED or DECLINED", 400);
    }

    const result = await respondToGuarantorRequest(id, req.memberId!, response);

    return success(res, result, result.message);
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const loanGuarantorStatus = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getLoanGuarantorStatus(req.params.loanId);
    return success(res, result, "Guarantor status retrieved");
  } catch (err: any) {
    return error(res, err.message);
  }
};
