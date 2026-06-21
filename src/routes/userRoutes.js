import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { ROLES } from "../constants/enums.js";
import {
  resetPasswordSchema,
  updateStatusSchema,
} from "../validators/userValidators.js";
import { resetPassword, updateStatus } from "../controllers/userController.js";

const router = Router();
router.use(authenticate);

const adminRoles = [ROLES.SUPER_ADMIN, ROLES.MANAGER];

router.post(
  "/:id/reset-password",
  requireRole(...adminRoles),
  validate(resetPasswordSchema),
  resetPassword,
);
router.patch(
  "/:id/status",
  requireRole(...adminRoles),
  validate(updateStatusSchema),
  updateStatus,
);

export default router;
