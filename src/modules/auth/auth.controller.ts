import { Request, Response } from "express";
import { registerMember, loginMember } from "./auth.service";
import { success, error } from "../../utils/response";
import {
  isValidEmail,
  isValidPhone,
  isValidPassword,
  normalizePhone,
} from "../../utils/validators";

export const register = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      nationalId,
      kraPin,
      employer,
      password,
      nextOfKin,
    } = req.body;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !nationalId ||
      !password ||
      !nextOfKin
    ) {
      return error(res, "All fields are required", 400);
    }

    if (!isValidEmail(email)) {
      return error(res, "Invalid email address", 400);
    }

    if (!isValidPhone(phone)) {
      return error(
        res,
        "Invalid phone number. Use format 07XX or +2547XX",
        400,
      );
    }

    if (!isValidPassword(password)) {
      return error(
        res,
        "Password must be at least 8 characters with one uppercase letter and one number",
        400,
      );
    }

    // Validate next of kin
    if (
      !nextOfKin.fullName ||
      !nextOfKin.relationship ||
      !nextOfKin.phone ||
      !nextOfKin.nationalId
    ) {
      return error(res, "Next of kin details are required", 400);
    }

    const result = await registerMember({
      firstName,
      lastName,
      email,
      phone: normalizePhone(phone),
      nationalId,
      kraPin,
      employer,
      password,
      nextOfKin,
    });

    return success(res, result, "Member registered successfully", 201);
  } catch (err: any) {
    return error(res, err.message, 400);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, "Email and password are required", 400);
    }

    const result = await loginMember({ email, password });

    return success(res, result, "Login successful");
  } catch (err: any) {
    return error(res, err.message, 401);
  }
};
