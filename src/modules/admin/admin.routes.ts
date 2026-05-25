import { Router } from "express";
import { dashboard, listMembers, updateStatus } from "./admin.controller";
import { protect, restrictTo } from "../../middleware/auth.middleware";

const router = Router();

router.use(protect);
router.use(restrictTo("ADMIN", "CEO"));

router.get("/dashboard", dashboard);
router.get("/members", listMembers);
router.patch("/members/:id/status", updateStatus);

export default router;
