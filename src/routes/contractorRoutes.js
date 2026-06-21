import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { ROLES } from "../constants/enums.js";
import {
  createContractorSchema,
  updateContractorSchema,
} from "../validators/userValidators.js";
import {
  createContractor,
  listContractors,
  getContractor,
  updateContractor,
} from "../controllers/userController.js";

const router = Router();
router.use(authenticate);

const adminRoles = [ROLES.SUPER_ADMIN, ROLES.MANAGER];

router.post(
  "/",
  requireRole(...adminRoles),
  validate(createContractorSchema),
  createContractor,
);
router.get("/", requireRole(...adminRoles), listContractors);
router.get("/:id", requireRole(...adminRoles), getContractor);
router.put(
  "/:id",
  requireRole(...adminRoles),
  validate(updateContractorSchema),
  updateContractor,
);

export default router;
