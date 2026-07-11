import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { ROLES } from "../constants/enums.js";
import {
  createSupervisorSchema,
  updateSupervisorSchema,
} from "../validators/userValidators.js";
import {
  createSupervisor,
  listSupervisors,
  getSupervisor,
  updateSupervisor,
} from "../controllers/userController.js";

const router = Router();
router.use(authenticate);

const adminRoles = [ROLES.SUPER_ADMIN, ROLES.MANAGER];

router.post(
  "/",
  requireRole(...adminRoles),
  validate(createSupervisorSchema),
  createSupervisor,
);
router.get("/", requireRole(...adminRoles), listSupervisors);
router.get("/:id", requireRole(...adminRoles), getSupervisor);
router.put(
  "/:id",
  requireRole(...adminRoles),
  validate(updateSupervisorSchema),
  updateSupervisor,
);

export default router;
