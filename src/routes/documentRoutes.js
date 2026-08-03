import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { upload } from "../middleware/upload.js";
import { requireRole } from "../middleware/rbac.js";
import { ROLES } from "../constants/enums.js";
import { uploadDocumentSchema } from "../validators/documentValidators.js";
import {
  uploadDocument,
  listDocuments,
  downloadDocument,
  deleteDocument,
  approveSuperAdminDocument,
  approveManagerDocument,
} from "../controllers/documentController.js";

const router = Router();
router.use(authenticate);

router.post("/", upload.single("file"), validate(uploadDocumentSchema), uploadDocument);
router.get("/", listDocuments);
router.get("/:id/download", downloadDocument);
router.patch("/:id/approve-super-admin", requireRole(ROLES.SUPER_ADMIN), approveSuperAdminDocument);
router.patch("/:id/approve-manager", requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER), approveManagerDocument);
router.delete("/:id", deleteDocument);

export default router;
