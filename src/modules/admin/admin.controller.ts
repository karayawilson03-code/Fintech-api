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
