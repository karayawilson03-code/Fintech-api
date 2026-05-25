import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadBankStatement, manualMatch } from "./reconciliation.controller";
import { protect, restrictTo } from "../../middleware/auth.middleware";

// Create uploads folder if it doesn't exist
const uploadDir = path.join(__dirname, "../../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${file.originalname}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files allowed"));
    }
  },
});

const router = Router();

router.use(protect);
router.use(restrictTo("ADMIN", "CEO", "TELLER"));

router.post("/upload", upload.single("statement"), uploadBankStatement);
router.post("/manual-match", manualMatch);

export default router;
