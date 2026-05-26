import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { getMemberStatement } from "./statements.service";
import { success, error } from "../../utils/response";

export const myStatement = async (req: AuthRequest, res: Response) => {
  try {
    const { from, to } = req.query;

    const result = await getMemberStatement(
      req.memberId!,
      from as string,
      to as string,
    );

    return success(res, result, "Statement generated successfully");
  } catch (err: any) {
    return error(res, err.message);
  }
};

export const memberStatement = async (req: AuthRequest, res: Response) => {
  try {
    const { from, to } = req.query;
    const { id } = req.params;

    const result = await getMemberStatement(id, from as string, to as string);

    return success(res, result, "Statement generated successfully");
  } catch (err: any) {
    return error(res, err.message);
  }
};
