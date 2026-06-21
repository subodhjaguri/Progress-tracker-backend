import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/auth.js";
import {
  loginSchema,
  changePasswordSchema,
} from "../validators/authValidators.js";
import { login, me, changePassword } from "../controllers/authController.js";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.get("/me", authenticate, me);
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  changePassword,
);

export default router;
