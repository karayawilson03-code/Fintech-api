import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const status = err.status || 500;
  const message = err.message || "Internal server error";

  console.error(`[ERROR] ${status} - ${message}`);

  res.status(status).json({
    success: false,
    message,
    data: null,
  });
};
