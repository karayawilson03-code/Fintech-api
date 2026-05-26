import { Router } from "express";
import { myStatement, memberStatement } from "./statements.controller";
import { protect, restrictTo } from "../../middleware/auth.middleware";

const router = Router();

router.use(protect);

// Member gets own statement
router.get("/my", myStatement);

// Admin gets any member's statement
router.get(
  "/member/:id",
  restrictTo("ADMIN", "CEO", "LOAN_OFFICER"),
  memberStatement,
);

export default router;
