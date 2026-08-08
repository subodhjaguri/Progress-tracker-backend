import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { ROLES } from "../constants/enums.js";
import {
  createEngineeringNote,
  listEngineeringNotes,
  deleteEngineeringNote,
} from "../controllers/engineerNoteController.js";

const router = Router();
router.use(authenticate);

router.post(
  "/",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR, ROLES.ENGINEER),
  createEngineeringNote,
);

router.get("/", listEngineeringNotes);

router.delete(
  "/:id",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.ENGINEER),
  deleteEngineeringNote,
);

export default router;
