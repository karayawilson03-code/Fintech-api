import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { error } from "../utils/response";

export interface AuthRequest extends Request {
  memberId?: string;
  role?: string;
}

export const protect = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return error(res, "Not authorized, no token", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      memberId: string;
      role: string;
    };

    req.memberId = decoded.memberId;
    req.role = decoded.role;
    next();
  } catch {
    return error(res, "Not authorized, invalid token", 401);
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.role!)) {
      return error(
        res,
        "You do not have permission to perform this action",
        403,
      );
    }
    next();
  };
};
