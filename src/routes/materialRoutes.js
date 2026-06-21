import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { ROLES } from "../constants/enums.js";
import { createMaterialSchema } from "../validators/materialValidators.js";
import { createMaterial, listMaterials } from "../controllers/materialController.js";

const router = Router();
router.use(authenticate);

router.post(
  "/",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  validate(createMaterialSchema),
  createMaterial,
);
router.get("/", listMaterials); // all roles, scoped

export default router;
