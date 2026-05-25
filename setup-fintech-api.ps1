# Run this from inside your fintech-api folder in PowerShell

Set-Content package.json '{
  "name": "fintech-api",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "test": "jest --runInBand",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "express": "^4.18.2",
    "uuid": "^9.0.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.11",
    "@types/node": "^20.11.0",
    "@types/supertest": "^6.0.2",
    "@types/uuid": "^9.0.7",
    "jest": "^29.7.0",
    "supertest": "^6.3.4",
    "ts-jest": "^29.1.1",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.3"
  }
}'

Set-Content tsconfig.json '{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}'

Set-Content jest.config.js 'module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests", "<rootDir>/src"],
  testMatch: ["**/*.test.ts"]
};'

Set-Content src/shared/types/index.ts @'
export type MemberStatus = "active" | "suspended" | "closed";
export type KYCStatus = "pending" | "verified" | "rejected";
export interface Member {
  id: string; email: string; firstName: string; lastName: string;
  status: MemberStatus; kycStatus: KYCStatus; createdAt: Date; updatedAt: Date;
}
export interface CreateMemberInput { email: string; firstName: string; lastName: string; }
export interface UpdateMemberInput { firstName?: string; lastName?: string; status?: MemberStatus; kycStatus?: KYCStatus; }
export type CardStatus = "active" | "frozen" | "cancelled";
export type CardNetwork = "visa" | "mastercard";
export type TransactionType = "purchase" | "refund" | "withdrawal" | "transfer";
export type TransactionStatus = "pending" | "completed" | "failed" | "reversed";
export type Currency = "USD" | "EUR" | "GBP" | "KES";
export interface Card {
  id: string; memberId: string; last4: string; network: CardNetwork;
  status: CardStatus; spendLimitCents: number; createdAt: Date; updatedAt: Date;
}
export interface CreateCardInput { memberId: string; network: CardNetwork; spendLimitCents?: number; }
export interface Transaction {
  id: string; cardId: string; memberId: string; type: TransactionType;
  status: TransactionStatus; amountCents: number; currency: Currency;
  merchantName?: string; merchantCategory?: string; description: string;
  createdAt: Date; updatedAt: Date;
}
export interface AuthorizeTransactionInput {
  cardId: string; amountCents: number; currency: Currency;
  merchantName?: string; merchantCategory?: string; description: string;
}
export type ReconciliationStatus = "matched" | "unmatched" | "disputed";
export interface ReconciliationEntry {
  id: string; transactionId: string; externalReference?: string;
  internalAmountCents: number; externalAmountCents?: number; currency: Currency;
  status: ReconciliationStatus; discrepancyCents: number; notes?: string;
  reconciledAt?: Date; createdAt: Date;
}
export interface ReconcileInput { transactionId: string; externalReference: string; externalAmountCents: number; currency: Currency; }
export interface ReconciliationReport {
  periodStart: Date; periodEnd: Date; totalTransactions: number;
  matched: number; unmatched: number; disputed: number;
  totalDiscrepancyCents: number; entries: ReconciliationEntry[];
}
export interface ApiResponse<T> { success: true; data: T; }
export interface ApiError { success: false; error: { code: string; message: string; details?: unknown; }; }
export type ApiResult<T> = ApiResponse<T> | ApiError;
export interface PaginatedResult<T> { items: T[]; total: number; page: number; pageSize: number; hasMore: boolean; }
'@

Set-Content src/shared/db/index.ts @'
import type { Member, Card, Transaction, ReconciliationEntry } from "../types";
export const db = {
  members: new Map<string, Member>(),
  cards: new Map<string, Card>(),
  transactions: new Map<string, Transaction>(),
  reconciliationEntries: new Map<string, ReconciliationEntry>(),
  reset() { this.members.clear(); this.cards.clear(); this.transactions.clear(); this.reconciliationEntries.clear(); }
};
'@

Set-Content src/shared/middleware/errors.ts @'
import { Request, Response, NextFunction } from "express";
export class AppError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message: string, public readonly details?: unknown) {
    super(message); this.name = "AppError";
  }
}
export class NotFoundError extends AppError { constructor(resource: string, id: string) { super(404, "NOT_FOUND", `${resource} with id "${id}" not found`); } }
export class ValidationError extends AppError { constructor(message: string, details?: unknown) { super(400, "VALIDATION_ERROR", message, details); } }
export class ConflictError extends AppError { constructor(message: string) { super(409, "CONFLICT", message); } }
export class ForbiddenError extends AppError { constructor(message: string) { super(403, "FORBIDDEN", message); } }
export class InsufficientFundsError extends AppError { constructor() { super(422, "INSUFFICIENT_FUNDS", "Transaction declined: spend limit exceeded"); } }
export class CardFrozenError extends AppError { constructor(cardId: string) { super(422, "CARD_FROZEN", `Card ${cardId} is frozen`); } }
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } });
    return;
  }
  console.error("[Unhandled Error]", err);
  res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } });
}
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next); };
}
'@

Set-Content src/services/member-management/member.service.ts @'
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { db } from "../../shared/db";
import { NotFoundError, ConflictError, ValidationError } from "../../shared/middleware/errors";
import type { Member, CreateMemberInput, UpdateMemberInput, PaginatedResult } from "../../shared/types";
export const CreateMemberSchema = z.object({ email: z.string().email(), firstName: z.string().min(1).max(100), lastName: z.string().min(1).max(100) });
export const UpdateMemberSchema = z.object({ firstName: z.string().min(1).max(100).optional(), lastName: z.string().min(1).max(100).optional(), status: z.enum(["active","suspended","closed"]).optional(), kycStatus: z.enum(["pending","verified","rejected"]).optional() });
export class MemberService {
  create(input: CreateMemberInput): Member {
    const parsed = CreateMemberSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("Invalid member data", parsed.error.flatten());
    const existing = Array.from(db.members.values()).find(m => m.email.toLowerCase() === input.email.toLowerCase());
    if (existing) throw new ConflictError(`A member with email "${input.email}" already exists`);
    const now = new Date();
    const member: Member = { id: uuidv4(), email: input.email.toLowerCase().trim(), firstName: input.firstName.trim(), lastName: input.lastName.trim(), status: "active", kycStatus: "pending", createdAt: now, updatedAt: now };
    db.members.set(member.id, member);
    return member;
  }
  getById(id: string): Member { const m = db.members.get(id); if (!m) throw new NotFoundError("Member", id); return m; }
  getByEmail(email: string): Member | undefined { return Array.from(db.members.values()).find(m => m.email === email.toLowerCase()); }
  list(page = 1, pageSize = 20): PaginatedResult<Member> {
    const all = Array.from(db.members.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = (page - 1) * pageSize;
    return { items: all.slice(start, start + pageSize), total: all.length, page, pageSize, hasMore: start + pageSize < all.length };
  }
  update(id: string, input: UpdateMemberInput): Member {
    const parsed = UpdateMemberSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("Invalid update data", parsed.error.flatten());
    const member = this.getById(id);
    const updated: Member = { ...member, ...parsed.data, updatedAt: new Date() };
    db.members.set(id, updated);
    return updated;
  }
  verifyKYC(id: string): Member { return this.update(id, { kycStatus: "verified" }); }
  suspend(id: string): Member { return this.update(id, { status: "suspended" }); }
  reactivate(id: string): Member { return this.update(id, { status: "active" }); }
  assertEligible(id: string): Member {
    const member = this.getById(id);
    if (member.status !== "active") throw new ValidationError(`Member account is ${member.status}`);
    if (member.kycStatus !== "verified") throw new ValidationError("Member KYC is not yet verified");
    return member;
  }
}
export const memberService = new MemberService();
'@

Set-Content src/services/card-processing/card.service.ts @'
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { db } from "../../shared/db";
import { NotFoundError, ValidationError, ForbiddenError, CardFrozenError, InsufficientFundsError } from "../../shared/middleware/errors";
import { memberService } from "../member-management/member.service";
import type { Card, Transaction, CreateCardInput, AuthorizeTransactionInput, PaginatedResult, CardStatus } from "../../shared/types";
const CreateCardSchema = z.object({ memberId: z.string().uuid(), network: z.enum(["visa","mastercard"]), spendLimitCents: z.number().int().positive().optional() });
const AuthorizeSchema = z.object({ cardId: z.string().uuid(), amountCents: z.number().int().positive(), currency: z.enum(["USD","EUR","GBP","KES"]), merchantName: z.string().max(200).optional(), merchantCategory: z.string().max(100).optional(), description: z.string().min(1).max(500) });
const DEFAULT_LIMIT = 500_000;
export class CardService {
  issueCard(input: CreateCardInput): Card {
    const parsed = CreateCardSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("Invalid card input", parsed.error.flatten());
    memberService.assertEligible(parsed.data.memberId);
    const now = new Date();
    const card: Card = { id: uuidv4(), memberId: parsed.data.memberId, last4: String(Math.floor(1000 + Math.random() * 9000)), network: parsed.data.network, status: "active", spendLimitCents: parsed.data.spendLimitCents ?? DEFAULT_LIMIT, createdAt: now, updatedAt: now };
    db.cards.set(card.id, card);
    return card;
  }
  getById(id: string): Card { const c = db.cards.get(id); if (!c) throw new NotFoundError("Card", id); return c; }
  getByMemberId(memberId: string): Card[] { return Array.from(db.cards.values()).filter(c => c.memberId === memberId).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()); }
  freeze(id: string): Card { return this.updateStatus(id, "frozen"); }
  unfreeze(id: string): Card { return this.updateStatus(id, "active"); }
  cancel(id: string): Card { return this.updateStatus(id, "cancelled"); }
  authorizeTransaction(input: AuthorizeTransactionInput): Transaction {
    const parsed = AuthorizeSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("Invalid transaction input", parsed.error.flatten());
    const card = this.getById(parsed.data.cardId);
    if (card.status === "frozen") throw new CardFrozenError(card.id);
    if (card.status === "cancelled") throw new ForbiddenError("Cannot process transaction on a cancelled card");
    const member = memberService.getById(card.memberId);
    if (member.status !== "active") throw new ForbiddenError(`Member account is ${member.status}`);
    if (this.getMonthlySpend(card.id) + parsed.data.amountCents > card.spendLimitCents) throw new InsufficientFundsError();
    const now = new Date();
    const tx: Transaction = { id: uuidv4(), cardId: card.id, memberId: card.memberId, type: "purchase", status: "completed", amountCents: parsed.data.amountCents, currency: parsed.data.currency, merchantName: parsed.data.merchantName, merchantCategory: parsed.data.merchantCategory, description: parsed.data.description, createdAt: now, updatedAt: now };
    db.transactions.set(tx.id, tx);
    return tx;
  }
  reverseTransaction(transactionId: string, reason: string): Transaction {
    const original = db.transactions.get(transactionId);
    if (!original) throw new NotFoundError("Transaction", transactionId);
    if (original.status === "reversed") throw new ValidationError("Transaction already reversed");
    if (original.type === "refund") throw new ValidationError("Cannot reverse a refund");
    db.transactions.set(transactionId, { ...original, status: "reversed", updatedAt: new Date() });
    const now = new Date();
    const refund: Transaction = { id: uuidv4(), cardId: original.cardId, memberId: original.memberId, type: "refund", status: "completed", amountCents: original.amountCents, currency: original.currency, merchantName: original.merchantName, merchantCategory: original.merchantCategory, description: `Reversal of ${transactionId}: ${reason}`, createdAt: now, updatedAt: now };
    db.transactions.set(refund.id, refund);
    return refund;
  }
  getTransactions(cardId: string, page = 1, pageSize = 20): PaginatedResult<Transaction> {
    this.getById(cardId);
    const all = Array.from(db.transactions.values()).filter(t => t.cardId === cardId).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = (page - 1) * pageSize;
    return { items: all.slice(start, start + pageSize), total: all.length, page, pageSize, hasMore: start + pageSize < all.length };
  }
  private updateStatus(cardId: string, status: CardStatus): Card { const card = this.getById(cardId); const updated = { ...card, status, updatedAt: new Date() }; db.cards.set(cardId, updated); return updated; }
  private getMonthlySpend(cardId: string): number {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    return Array.from(db.transactions.values()).filter(t => t.cardId === cardId && t.type === "purchase" && t.status === "completed" && t.createdAt >= monthStart).reduce((sum, t) => sum + t.amountCents, 0);
  }
}
export const cardService = new CardService();
'@

Set-Content src/services/reconciliation/reconciliation.service.ts @'
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { db } from "../../shared/db";
import { NotFoundError, ValidationError, ConflictError } from "../../shared/middleware/errors";
import type { ReconciliationEntry, ReconcileInput, ReconciliationReport, Currency } from "../../shared/types";
const ReconcileSchema = z.object({ transactionId: z.string().uuid(), externalReference: z.string().min(1).max(200), externalAmountCents: z.number().int().positive(), currency: z.enum(["USD","EUR","GBP","KES"]) });
export class ReconciliationService {
  reconcile(input: ReconcileInput): ReconciliationEntry {
    const parsed = ReconcileSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError("Invalid reconciliation input", parsed.error.flatten());
    const transaction = db.transactions.get(parsed.data.transactionId);
    if (!transaction) throw new NotFoundError("Transaction", parsed.data.transactionId);
    const existing = Array.from(db.reconciliationEntries.values()).find(e => e.transactionId === parsed.data.transactionId);
    if (existing) throw new ConflictError(`Transaction ${parsed.data.transactionId} already reconciled`);
    const discrepancyCents = Math.abs(transaction.amountCents - parsed.data.externalAmountCents);
    const status = discrepancyCents <= 1 ? "matched" : "disputed";
    const now = new Date();
    const entry: ReconciliationEntry = { id: uuidv4(), transactionId: parsed.data.transactionId, externalReference: parsed.data.externalReference, internalAmountCents: transaction.amountCents, externalAmountCents: parsed.data.externalAmountCents, currency: parsed.data.currency as Currency, status, discrepancyCents, notes: status === "disputed" ? `Amount mismatch: internal ${transaction.amountCents} vs external ${parsed.data.externalAmountCents}` : undefined, reconciledAt: now, createdAt: now };
    db.reconciliationEntries.set(entry.id, entry);
    return entry;
  }
  flagUnmatched(transactionId: string, notes?: string): ReconciliationEntry {
    const transaction = db.transactions.get(transactionId);
    if (!transaction) throw new NotFoundError("Transaction", transactionId);
    const now = new Date();
    const entry: ReconciliationEntry = { id: uuidv4(), transactionId, internalAmountCents: transaction.amountCents, currency: transaction.currency, status: "unmatched", discrepancyCents: transaction.amountCents, notes: notes ?? "No matching external record found", createdAt: now };
    db.reconciliationEntries.set(entry.id, entry);
    return entry;
  }
  getById(id: string): ReconciliationEntry { const e = db.reconciliationEntries.get(id); if (!e) throw new NotFoundError("ReconciliationEntry", id); return e; }
  getByTransactionId(transactionId: string): ReconciliationEntry | undefined { return Array.from(db.reconciliationEntries.values()).find(e => e.transactionId === transactionId); }
  generateReport(periodStart: Date, periodEnd: Date): ReconciliationReport {
    const entries = Array.from(db.reconciliationEntries.values()).filter(e => e.createdAt >= periodStart && e.createdAt <= periodEnd);
    return { periodStart, periodEnd, totalTransactions: entries.length, matched: entries.filter(e => e.status === "matched").length, unmatched: entries.filter(e => e.status === "unmatched").length, disputed: entries.filter(e => e.status === "disputed").length, totalDiscrepancyCents: entries.reduce((s,e) => s + e.discrepancyCents, 0), entries: entries.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()) };
  }
}
export const reconciliationService = new ReconciliationService();
'@

Set-Content src/routes/members.ts @'
import { Router, Request, Response } from "express";
import { memberService } from "../services/member-management/member.service";
import { asyncHandler } from "../shared/middleware/errors";
export const memberRouter = Router();
memberRouter.post("/", asyncHandler(async (req, res) => { const m = memberService.create(req.body); res.status(201).json({ success: true, data: m }); }));
memberRouter.get("/", asyncHandler(async (req, res) => { const page = Number(req.query["page"]) || 1; const pageSize = Math.min(Number(req.query["pageSize"]) || 20, 100); res.json({ success: true, data: memberService.list(page, pageSize) }); }));
memberRouter.get("/:id", asyncHandler(async (req, res) => { res.json({ success: true, data: memberService.getById(req.params["id"]!) }); }));
memberRouter.patch("/:id", asyncHandler(async (req, res) => { res.json({ success: true, data: memberService.update(req.params["id"]!, req.body) }); }));
memberRouter.post("/:id/kyc/verify", asyncHandler(async (req, res) => { res.json({ success: true, data: memberService.verifyKYC(req.params["id"]!) }); }));
memberRouter.post("/:id/suspend", asyncHandler(async (req, res) => { res.json({ success: true, data: memberService.suspend(req.params["id"]!) }); }));
memberRouter.post("/:id/reactivate", asyncHandler(async (req, res) => { res.json({ success: true, data: memberService.reactivate(req.params["id"]!) }); }));
'@

Set-Content src/routes/cards.ts @'
import { Router, Request, Response } from "express";
import { cardService } from "../services/card-processing/card.service";
import { asyncHandler } from "../shared/middleware/errors";
export const cardRouter = Router();
cardRouter.post("/", asyncHandler(async (req, res) => { res.status(201).json({ success: true, data: cardService.issueCard(req.body) }); }));
cardRouter.get("/member/:memberId", asyncHandler(async (req, res) => { res.json({ success: true, data: cardService.getByMemberId(req.params["memberId"]!) }); }));
cardRouter.post("/transactions/authorize", asyncHandler(async (req, res) => { res.status(201).json({ success: true, data: cardService.authorizeTransaction(req.body) }); }));
cardRouter.post("/transactions/:transactionId/reverse", asyncHandler(async (req, res) => { const { reason } = req.body as { reason?: string }; res.status(201).json({ success: true, data: cardService.reverseTransaction(req.params["transactionId"]!, reason ?? "No reason provided") }); }));
cardRouter.get("/:id/transactions", asyncHandler(async (req, res) => { const page = Number(req.query["page"]) || 1; res.json({ success: true, data: cardService.getTransactions(req.params["id"]!, page) }); }));
cardRouter.get("/:id", asyncHandler(async (req, res) => { res.json({ success: true, data: cardService.getById(req.params["id"]!) }); }));
cardRouter.post("/:id/freeze", asyncHandler(async (req, res) => { res.json({ success: true, data: cardService.freeze(req.params["id"]!) }); }));
cardRouter.post("/:id/unfreeze", asyncHandler(async (req, res) => { res.json({ success: true, data: cardService.unfreeze(req.params["id"]!) }); }));
cardRouter.post("/:id/cancel", asyncHandler(async (req, res) => { res.json({ success: true, data: cardService.cancel(req.params["id"]!) }); }));
'@

Set-Content src/routes/reconciliation.ts @'
import { Router } from "express";
import { reconciliationService } from "../services/reconciliation/reconciliation.service";
import { asyncHandler } from "../shared/middleware/errors";
export const reconciliationRouter = Router();
reconciliationRouter.post("/", asyncHandler(async (req, res) => { res.status(201).json({ success: true, data: reconciliationService.reconcile(req.body) }); }));
reconciliationRouter.post("/flag-unmatched", asyncHandler(async (req, res) => { const { transactionId, notes } = req.body as { transactionId: string; notes?: string }; res.status(201).json({ success: true, data: reconciliationService.flagUnmatched(transactionId, notes) }); }));
reconciliationRouter.get("/report/summary", asyncHandler(async (req, res) => { const { start, end } = req.query as { start?: string; end?: string }; const periodStart = start ? new Date(start) : new Date(Date.now() - 30*24*60*60*1000); const periodEnd = end ? new Date(end) : new Date(); res.json({ success: true, data: reconciliationService.generateReport(periodStart, periodEnd) }); }));
reconciliationRouter.get("/transaction/:transactionId", asyncHandler(async (req, res) => { res.json({ success: true, data: reconciliationService.getByTransactionId(req.params["transactionId"]!) ?? null }); }));
reconciliationRouter.get("/:id", asyncHandler(async (req, res) => { res.json({ success: true, data: reconciliationService.getById(req.params["id"]!) }); }));
'@

Set-Content src/app.ts @'
import express from "express";
import { memberRouter } from "./routes/members";
import { cardRouter } from "./routes/cards";
import { reconciliationRouter } from "./routes/reconciliation";
import { errorHandler } from "./shared/middleware/errors";
const app = express();
app.use(express.json());
app.get("/health", (_req, res) => { res.json({ status: "ok", timestamp: new Date().toISOString() }); });
app.use("/members", memberRouter);
app.use("/cards", cardRouter);
app.use("/reconciliation", reconciliationRouter);
app.use(errorHandler);
export { app };
'@

Set-Content src/index.ts @'
import { app } from "./app";
const PORT = process.env["PORT"] ?? 3000;
app.listen(PORT, () => { console.log(`\n Fintech API running at http://localhost:${PORT}\n`); });
'@

Set-Content tests/unit/member.service.test.ts @'
import { MemberService } from "../../src/services/member-management/member.service";
import { db } from "../../src/shared/db";
describe("MemberService", () => {
  let service: MemberService;
  beforeEach(() => { db.reset(); service = new MemberService(); });
  it("creates a member with correct defaults", () => {
    const m = service.create({ email: "alice@test.com", firstName: "Alice", lastName: "Mwangi" });
    expect(m.status).toBe("active"); expect(m.kycStatus).toBe("pending");
  });
  it("rejects duplicate emails", () => {
    service.create({ email: "alice@test.com", firstName: "Alice", lastName: "Mwangi" });
    expect(() => service.create({ email: "alice@test.com", firstName: "B", lastName: "C" })).toThrow(expect.objectContaining({ code: "CONFLICT" }));
  });
  it("rejects invalid email", () => { expect(() => service.create({ email: "bad", firstName: "A", lastName: "B" })).toThrow(expect.objectContaining({ code: "VALIDATION_ERROR" })); });
  it("verifies KYC", () => { const m = service.create({ email: "b@b.com", firstName: "B", lastName: "C" }); expect(service.verifyKYC(m.id).kycStatus).toBe("verified"); });
  it("throws NOT_FOUND for unknown id", () => { expect(() => service.getById("00000000-0000-0000-0000-000000000000")).toThrow(expect.objectContaining({ code: "NOT_FOUND" })); });
  it("blocks card if KYC pending", () => { const m = service.create({ email: "c@c.com", firstName: "C", lastName: "D" }); expect(() => service.assertEligible(m.id)).toThrow(); });
});
'@

Set-Content tests/unit/card.service.test.ts @'
import { CardService } from "../../src/services/card-processing/card.service";
import { MemberService } from "../../src/services/member-management/member.service";
import { db } from "../../src/shared/db";
function makeVerifiedMember(ms: MemberService, email = "u@u.com") { const m = ms.create({ email, firstName: "A", lastName: "B" }); return ms.verifyKYC(m.id); }
describe("CardService", () => {
  let cardSvc: CardService; let memberSvc: MemberService;
  beforeEach(() => { db.reset(); memberSvc = new MemberService(); cardSvc = new CardService(); });
  it("issues a card to verified member", () => { const m = makeVerifiedMember(memberSvc); const c = cardSvc.issueCard({ memberId: m.id, network: "visa" }); expect(c.status).toBe("active"); expect(c.last4).toHaveLength(4); });
  it("rejects card for KYC-pending member", () => { const m = memberSvc.create({ email: "p@p.com", firstName: "P", lastName: "Q" }); expect(() => cardSvc.issueCard({ memberId: m.id, network: "visa" })).toThrow(); });
  it("declines on frozen card", () => { const m = makeVerifiedMember(memberSvc, "f@f.com"); const c = cardSvc.issueCard({ memberId: m.id, network: "visa" }); cardSvc.freeze(c.id); expect(() => cardSvc.authorizeTransaction({ cardId: c.id, amountCents: 100, currency: "USD", description: "x" })).toThrow(expect.objectContaining({ code: "CARD_FROZEN" })); });
  it("declines when over spend limit", () => { const m = makeVerifiedMember(memberSvc, "s@s.com"); const c = cardSvc.issueCard({ memberId: m.id, network: "visa", spendLimitCents: 1000 }); cardSvc.authorizeTransaction({ cardId: c.id, amountCents: 900, currency: "USD", description: "first" }); expect(() => cardSvc.authorizeTransaction({ cardId: c.id, amountCents: 200, currency: "USD", description: "second" })).toThrow(expect.objectContaining({ code: "INSUFFICIENT_FUNDS" })); });
  it("reverses a transaction", () => { const m = makeVerifiedMember(memberSvc, "r@r.com"); const c = cardSvc.issueCard({ memberId: m.id, network: "visa" }); const tx = cardSvc.authorizeTransaction({ cardId: c.id, amountCents: 500, currency: "USD", description: "buy" }); const refund = cardSvc.reverseTransaction(tx.id, "return"); expect(refund.type).toBe("refund"); });
});
'@

Set-Content tests/unit/reconciliation.service.test.ts @'
import { ReconciliationService } from "../../src/services/reconciliation/reconciliation.service";
import { CardService } from "../../src/services/card-processing/card.service";
import { MemberService } from "../../src/services/member-management/member.service";
import { db } from "../../src/shared/db";
function makeTx() {
  const ms = new MemberService(); const cs = new CardService();
  const m = ms.create({ email: "r@r.com", firstName: "R", lastName: "E" }); ms.verifyKYC(m.id);
  const c = cs.issueCard({ memberId: m.id, network: "visa" });
  return cs.authorizeTransaction({ cardId: c.id, amountCents: 10000, currency: "USD", description: "test" });
}
describe("ReconciliationService", () => {
  let svc: ReconciliationService;
  beforeEach(() => { db.reset(); svc = new ReconciliationService(); });
  it("matches when amounts agree", () => { const tx = makeTx(); const e = svc.reconcile({ transactionId: tx.id, externalReference: "REF1", externalAmountCents: 10000, currency: "USD" }); expect(e.status).toBe("matched"); });
  it("disputes when amounts differ", () => { const tx = makeTx(); const e = svc.reconcile({ transactionId: tx.id, externalReference: "REF2", externalAmountCents: 9000, currency: "USD" }); expect(e.status).toBe("disputed"); });
  it("throws CONFLICT on double reconciliation", () => { const tx = makeTx(); svc.reconcile({ transactionId: tx.id, externalReference: "REF3", externalAmountCents: 10000, currency: "USD" }); expect(() => svc.reconcile({ transactionId: tx.id, externalReference: "REF4", externalAmountCents: 10000, currency: "USD" })).toThrow(expect.objectContaining({ code: "CONFLICT" })); });
});
'@

Set-Content tests/integration/api.test.ts @'
import request from "supertest";
import { app } from "../../src/app";
import { db } from "../../src/shared/db";
beforeEach(() => db.reset());
describe("API integration", () => {
  it("completes the full happy path", async () => {
    const mRes = await request(app).post("/members").send({ email: "jane@test.com", firstName: "Jane", lastName: "Kamau" }).expect(201);
    const memberId = mRes.body.data.id;
    await request(app).post(`/members/${memberId}/kyc/verify`).expect(200);
    const cRes = await request(app).post("/cards").send({ memberId, network: "visa" }).expect(201);
    const cardId = cRes.body.data.id;
    const txRes = await request(app).post("/cards/transactions/authorize").send({ cardId, amountCents: 5000, currency: "USD", description: "Coffee" }).expect(201);
    const txId = txRes.body.data.id;
    const rRes = await request(app).post("/reconciliation").send({ transactionId: txId, externalReference: "EXT-001", externalAmountCents: 5000, currency: "USD" }).expect(201);
    expect(rRes.body.data.status).toBe("matched");
  });
  it("returns 404 for unknown member", async () => { await request(app).get("/members/00000000-0000-0000-0000-000000000000").expect(404); });
  it("returns 409 on duplicate email", async () => { await request(app).post("/members").send({ email: "dup@test.com", firstName: "A", lastName: "B" }).expect(201); await request(app).post("/members").send({ email: "dup@test.com", firstName: "C", lastName: "D" }).expect(409); });
  it("blocks transaction on frozen card", async () => {
    const mRes = await request(app).post("/members").send({ email: "freeze@test.com", firstName: "F", lastName: "G" }).expect(201);
    const memberId = mRes.body.data.id;
    await request(app).post(`/members/${memberId}/kyc/verify`);
    const cRes = await request(app).post("/cards").send({ memberId, network: "visa" }).expect(201);
    const cardId = cRes.body.data.id;
    await request(app).post(`/cards/${cardId}/freeze`).expect(200);
    await request(app).post("/cards/transactions/authorize").send({ cardId, amountCents: 100, currency: "USD", description: "x" }).expect(422);
  });
});
'@

Write-Host ""
Write-Host "All files created." -ForegroundColor Green
Write-Host "Now run: npm install" -ForegroundColor Cyan
