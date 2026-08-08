import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { ROLES } from "../constants/enums.js";
import {
  createWorkOrderSchema,
  updateWorkOrderSchema,
} from "../validators/workOrderValidators.js";
import {
  createWorkOrder,
  listWorkOrders,
  getWorkOrder,
  updateWorkOrder,
} from "../controllers/workOrderController.js";
import { createProgressUpdateSchema } from "../validators/progressUpdateValidators.js";
import {
  listProgressUpdates,
  createProgressUpdate,
} from "../controllers/progressUpdateController.js";

const router = Router();
router.use(authenticate);

const editors = [ROLES.SUPER_ADMIN, ROLES.MANAGER];

router.post("/", requireRole(...editors), validate(createWorkOrderSchema), createWorkOrder);
router.get("/", listWorkOrders); // all roles, scoped
router.get("/:id", getWorkOrder); // all roles, scoped
router.put("/:id", requireRole(...editors), validate(updateWorkOrderSchema), updateWorkOrder);

// Nested progress updates. Reading follows work-order visibility; posting is the
// site supervisor's job only — managers and contractors report through them.
router.get("/:id/progress-updates", listProgressUpdates);
router.post(
  "/:id/progress-updates",
  requireRole(ROLES.SUPERVISOR),
  validate(createProgressUpdateSchema),
  createProgressUpdate,
);

export default router;
