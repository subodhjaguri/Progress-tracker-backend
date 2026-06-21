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
import { createLabourTaskSchema } from "../validators/labourTaskValidators.js";
import {
  listLabourTasks,
  createLabourTask,
} from "../controllers/labourTaskController.js";
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

// Nested labour tasks (read: anyone who can see the WO; create: assigned contractor)
router.get("/:id/labour-tasks", listLabourTasks);
router.post(
  "/:id/labour-tasks",
  requireRole(ROLES.CONTRACTOR),
  validate(createLabourTaskSchema),
  createLabourTask,
);

// Nested progress updates (read + post require WO visibility = who may update it)
router.get("/:id/progress-updates", listProgressUpdates);
router.post(
  "/:id/progress-updates",
  validate(createProgressUpdateSchema),
  createProgressUpdate,
);

export default router;
