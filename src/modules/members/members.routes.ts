import { Router } from "express";
import { dashboard } from "./members.controller";
import { protect } from "../../middleware/auth.middleware";

const router = Router();

router.use(protect);
router.get("/dashboard", dashboard);

export default router;
