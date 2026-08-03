import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { ROLES } from "../constants/enums.js";
import {
  createMaterialSchema,
  createBulkMaterialSchema,
  confirmMaterialSchema,
} from "../validators/materialValidators.js";
import {
  createMaterial,
  createBulkMaterial,
  listMaterials,
  confirmMaterial,
  requestMaterial,
  provideMaterial,
  acknowledgeMaterial,
} from "../controllers/materialController.js";

const router = Router();
router.use(authenticate);

// POST is open to Manager (Received/Issued) and Supervisor (Used); the controller
// enforces which role may record which movement type.
router.post(
  "/",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR),
  validate(createMaterialSchema),
  createMaterial,
);
router.post(
  "/bulk",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR),
  validate(createBulkMaterialSchema),
  createBulkMaterial,
);
router.post(
  "/request",
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUPERVISOR, ROLES.MANAGER),
  requestMaterial,
);
router.patch(
  "/:id/provide",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  provideMaterial,
);
router.patch(
  "/:id/acknowledge",
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUPERVISOR),
  acknowledgeMaterial,
);
router.post(
  "/:id/confirm",
  requireRole(ROLES.SUPER_ADMIN, ROLES.SUPERVISOR),
  validate(confirmMaterialSchema),
  confirmMaterial,
);
router.get("/", listMaterials); // all roles, scoped

export default router;
