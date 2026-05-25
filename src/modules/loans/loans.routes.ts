import { Router } from "express";
import {
  apply,
  getMyLoans,
  getLoan,
  approve,
  reject,
  disburse,
  repay,
} from "./loans.controller";
import { protect, restrictTo } from "../../middleware/auth.middleware";

const router = Router();

router.use(protect);

// Member routes
router.post("/", apply);
router.get("/", getMyLoans);
router.get("/:id", getLoan);
router.post("/:id/repay", repay);

// Admin/Loan officer routes
router.patch(
  "/:id/approve",
  restrictTo("ADMIN", "LOAN_OFFICER", "CEO"),
  approve,
);
router.patch("/:id/reject", restrictTo("ADMIN", "LOAN_OFFICER", "CEO"), reject);
router.patch("/:id/disburse", restrictTo("ADMIN", "CEO"), disburse);

export default router;
