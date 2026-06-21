import { z } from "zod";
import { enumOf } from "./helpers.js";
import { SKILLS } from "../constants/enums.js";

const mobile = z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile");
const aadhaar = z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits");

export const createLabourSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile: mobile.optional(),
  aadhaarNumber: aadhaar.optional(),
  skill: enumOf(SKILLS),
});

export const updateLabourSchema = z
  .object({
    name: z.string().min(1).optional(),
    mobile: mobile.optional(),
    aadhaarNumber: aadhaar.optional(),
    skill: enumOf(SKILLS).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });
