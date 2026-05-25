import { Response } from "express";

export const success = (
  res: Response,
  data: any,
  message = "Success",
  status = 200,
) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

export const error = (
  res: Response,
  message = "Something went wrong",
  status = 400,
) => {
  return res.status(status).json({
    success: false,
    message,
    data: null,
  });
};
