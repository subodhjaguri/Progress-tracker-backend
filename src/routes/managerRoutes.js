import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { ROLES } from "../constants/enums.js";
import { createManagerSchema } from "../validators/userValidators.js";
import { createManager, listManagers } from "../controllers/userController.js";

const router = Router();
router.use(authenticate);

router.post(
  "/",
  requireRole(ROLES.SUPER_ADMIN),
  validate(createManagerSchema),
  createManager,
);
router.get("/", requireRole(ROLES.SUPER_ADMIN), listManagers);

export default router;
