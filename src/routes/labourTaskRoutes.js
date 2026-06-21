import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { ROLES } from "../constants/enums.js";
import { updateLabourTaskSchema } from "../validators/labourTaskValidators.js";
import {
  updateLabourTask,
  deleteLabourTask,
} from "../controllers/labourTaskController.js";

// Nested create/list live under /work-orders/:id/labour-tasks (see workOrderRoutes).
const router = Router();
router.use(authenticate);

router.put("/:id", requireRole(ROLES.CONTRACTOR), validate(updateLabourTaskSchema), updateLabourTask);
router.delete("/:id", requireRole(ROLES.CONTRACTOR), deleteLabourTask);

export default router;
