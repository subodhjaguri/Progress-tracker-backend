import { z } from "zod";

const mobile = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");
const email = z.string().email("Enter a valid email").optional();
const optionalPassword = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .optional();
const aadhaar = z
  .string()
  .regex(/^\d{12}$/, "Aadhaar must be 12 digits")
  .optional();

export const createManagerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile,
  email,
  password: optionalPassword,
});

export const createContractorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile,
  email,
  password: optionalPassword,
  aadhaarNumber: aadhaar,
  address: z.string().optional(),
});

export const updateContractorSchema = z
  .object({
    name: z.string().min(1).optional(),
    mobile: mobile.optional(),
    email,
    aadhaarNumber: aadhaar,
    address: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const createSupervisorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile,
  email,
  password: optionalPassword,
});

export const updateSupervisorSchema = z
  .object({
    name: z.string().min(1).optional(),
    mobile: mobile.optional(),
    email,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const resetPasswordSchema = z.object({
  password: optionalPassword,
});

export const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
