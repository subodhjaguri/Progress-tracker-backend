import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { ROLES } from "../constants/enums.js";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../validators/projectValidators.js";
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
} from "../controllers/projectController.js";
import { dailyReport } from "../controllers/reportController.js";

const router = Router();
router.use(authenticate);

const editors = [ROLES.SUPER_ADMIN, ROLES.MANAGER];

router.post("/", requireRole(...editors), validate(createProjectSchema), createProject);
router.get("/", listProjects); // all roles, scoped
router.get("/:id", getProject); // all roles, scoped
router.get("/:id/daily-report", dailyReport); // PRD §14, scoped
router.put("/:id", requireRole(...editors), validate(updateProjectSchema), updateProject);

export default router;
