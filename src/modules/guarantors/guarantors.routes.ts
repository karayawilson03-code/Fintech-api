import { Router } from "express";
import {
  myRequests,
  respond,
  loanGuarantorStatus,
} from "./guarantors.controller";
import { protect, restrictTo } from "../../middleware/auth.middleware";

const router = Router();

router.use(protect);

// Member — see and respond to guarantor requests
router.get("/", myRequests);
router.patch("/:id/respond", respond);

// Admin/Loan Officer — check guarantor status on a loan
router.get(
  "/loan/:loanId/status",
  restrictTo("ADMIN", "LOAN_OFFICER", "CEO"),
  loanGuarantorStatus,
);

export default router;
