import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/error.middleware";
import authRoutes from "./modules/auth/auth.routes";
import savingsRoutes from "./modules/savings/savings.routes";
import sharesRoutes from "./modules/shares/shares.routes";
import loansRoutes from "./modules/loans/loans.routes";
import reconciliationRoutes from "./modules/reconciliation/reconciliation.routes";
import membersRoutes from "./modules/members/members.routes";
import adminRoutes from "./modules/admin/admin.routes";
import guarantorsRoutes from "./modules/guarantors/guarantors.routes";
import statementsRoutes from "./modules/statements/statements.routes";
import penaltiesRoutes from "./modules/penalties/penalties.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Hyrax Achievers SACCO API",
    sacco: "Kasarani, Nairobi",
    version: "1.0.0",
    status: "running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/savings", savingsRoutes);
app.use("/api/shares", sharesRoutes);
app.use("/api/loans", loansRoutes);
app.use("/api/reconciliation", reconciliationRoutes);
app.use("/api/members", membersRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/guarantors", guarantorsRoutes);
app.use("/api/statements", statementsRoutes);
app.use("/api/penalties", penaltiesRoutes);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Hyrax Achievers SACCO API running on port ${PORT}`);
});

export default app;
