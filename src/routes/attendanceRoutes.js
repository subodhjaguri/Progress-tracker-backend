import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { ROLES } from "../constants/enums.js";
import { markAttendanceSchema } from "../validators/attendanceValidators.js";
import {
  markAttendance,
  listAttendance,
  attendanceSummary,
} from "../controllers/attendanceController.js";

const router = Router();
router.use(authenticate);

router.post("/", requireRole(ROLES.SUPERVISOR), validate(markAttendanceSchema), markAttendance);
router.get("/summary", attendanceSummary); // before "/" — static path
router.get("/", listAttendance);

export default router;
