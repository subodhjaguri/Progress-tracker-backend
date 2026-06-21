import { z } from "zod";

export const mobileSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

/** A string constrained to one of `values` (robust across zod versions). */
export const enumOf = (values) =>
  z.string().refine((v) => values.includes(v), {
    message: `Must be one of: ${values.join(", ")}`,
  });
