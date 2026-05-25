import { Router } from "express";
import { buyShares, getSummary, getHistory } from "./shares.controller";
import { protect } from "../../middleware/auth.middleware";

const router = Router();

router.use(protect);

router.post("/buy", buyShares);
router.get("/summary", getSummary);
router.get("/history", getHistory);

export default router;
