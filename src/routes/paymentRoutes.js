import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { ROLES } from "../constants/enums.js";
import {
  createPaymentSchema,
  updatePaymentStatusSchema,
} from "../validators/paymentValidators.js";
import {
  createPayment,
  listPayments,
  updatePaymentStatus,
} from "../controllers/paymentController.js";

const router = Router();
router.use(authenticate);

router.post(
  "/",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR),
  validate(createPaymentSchema),
  createPayment,
);

router.get("/", listPayments);

router.patch(
  "/:id/status",
  requireRole(ROLES.SUPER_ADMIN, ROLES.MANAGER),
  validate(updatePaymentStatusSchema),
  updatePaymentStatus,
);

export default router;
