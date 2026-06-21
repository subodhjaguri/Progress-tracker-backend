import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { upload } from "../middleware/upload.js";
import { uploadDocumentSchema } from "../validators/documentValidators.js";
import {
  uploadDocument,
  listDocuments,
  downloadDocument,
  deleteDocument,
} from "../controllers/documentController.js";

const router = Router();
router.use(authenticate);

router.post("/", upload.single("file"), validate(uploadDocumentSchema), uploadDocument);
router.get("/", listDocuments);
router.get("/:id/download", downloadDocument);
router.delete("/:id", deleteDocument);

export default router;
