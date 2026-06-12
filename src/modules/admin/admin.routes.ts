import { Router } from "express";
import {
  dashboard,
  listMembers,
  updateStatus,
  listLoans,
  updateLoan,
  listSavings,
  listShares,
  listPenalties,
  payPenalty,
  listTransactions,
} from "./admin.controller";
import { protect, restrictTo } from "../../middleware/auth.middleware";

const router = Router();

router.use(protect);
router.use(restrictTo("ADMIN", "CEO"));

// ── DASHBOARD ─────────────────────────────────────────────────────────────
router.get("/dashboard", dashboard);

// ── MEMBERS ───────────────────────────────────────────────────────────────
router.get("/members", listMembers);
router.patch("/members/:id/status", updateStatus);

// ── LOANS ─────────────────────────────────────────────────────────────────
router.get("/loans", listLoans);
router.patch("/loans/:id/status", updateLoan);

// ── SAVINGS ───────────────────────────────────────────────────────────────
router.get("/savings", listSavings);

// ── SHARES ────────────────────────────────────────────────────────────────
router.get("/shares", listShares);

// ── PENALTIES ─────────────────────────────────────────────────────────────
router.get("/penalties", listPenalties);
router.patch("/penalties/:id/pay", payPenalty);

// ── TRANSACTIONS ──────────────────────────────────────────────────────────
router.get("/transactions", listTransactions);

export default router;
