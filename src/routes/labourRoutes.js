import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { ROLES } from "../constants/enums.js";
import {
  createLabourSchema,
  updateLabourSchema,
} from "../validators/labourValidators.js";
import {
  createLabour,
  listLabour,
  getLabour,
  updateLabour,
  deleteLabour,
} from "../controllers/labourController.js";

const router = Router();
router.use(authenticate);

router.post("/", requireRole(ROLES.CONTRACTOR), validate(createLabourSchema), createLabour);
router.get("/", listLabour); // all roles, scoped
router.get("/:id", getLabour); // all roles, scoped
router.put("/:id", requireRole(ROLES.CONTRACTOR), validate(updateLabourSchema), updateLabour);
router.delete("/:id", requireRole(ROLES.CONTRACTOR), deleteLabour);

export default router;
