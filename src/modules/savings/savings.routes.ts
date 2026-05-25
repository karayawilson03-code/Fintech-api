import { Router } from "express";
import {
  deposit,
  getBalance,
  getHistory,
  creditInterest,
} from "./savings.controller";
import { protect } from "../../middleware/auth.middleware";

const router = Router();

router.use(protect);

router.post("/deposit", deposit);
router.get("/balance", getBalance);
router.get("/history", getHistory);
router.post("/credit-interest", creditInterest);

export default router;
