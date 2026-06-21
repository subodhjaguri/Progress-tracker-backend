import { z } from "zod";

const mobile = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

export const loginSchema = z.object({
  mobile,
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});
