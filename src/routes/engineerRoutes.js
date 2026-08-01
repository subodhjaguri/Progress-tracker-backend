import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { ROLES } from "../constants/enums.js";
import {
  createEngineerSchema,
  updateEngineerSchema,
} from "../validators/userValidators.js";
import {
  createEngineer,
  listEngineers,
  getEngineer,
  updateEngineer,
} from "../controllers/userController.js";

const router = Router();
router.use(authenticate);

const adminRoles = [ROLES.SUPER_ADMIN, ROLES.MANAGER];

router.post(
  "/",
  requireRole(...adminRoles),
  validate(createEngineerSchema),
  createEngineer,
);
router.get("/", requireRole(...adminRoles), listEngineers);
router.get("/:id", requireRole(...adminRoles), getEngineer);
router.put(
  "/:id",
  requireRole(...adminRoles),
  validate(updateEngineerSchema),
  updateEngineer,
);

export default router;
