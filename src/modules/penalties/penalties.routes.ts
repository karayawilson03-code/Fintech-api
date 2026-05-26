import { Router } from "express";
import {
  runPenaltyCalculation,
  myPenalties,
  pay,
  allPenalties,
} from "./penalties.controller";
import { protect, restrictTo } from "../../middleware/auth.middleware";

const router = Router();

router.use(protect);

// Member routes
router.get("/my", myPenalties);
router.post("/pay", pay);

// Admin routes
router.post("/calculate", restrictTo("ADMIN", "CEO"), runPenaltyCalculation);
router.get("/all", restrictTo("ADMIN", "CEO", "LOAN_OFFICER"), allPenalties);

export default router;
