import { z } from "zod";
import { enumOf } from "./helpers.js";
import { PROJECT_STATUS } from "../constants/enums.js";

const fields = {
  name: z.string().min(1, "Project name is required"),
  clientName: z.string().optional(),
  clientMobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile")
    .optional(),
  siteName: z.string().optional(),
  siteLocation: z.string().optional(),
  siteAddress: z.string().optional(),
  description: z.string().optional(),
  startDate: z.coerce.date().optional(),
  targetDate: z.coerce.date().optional(),
  status: enumOf(PROJECT_STATUS).optional(),
  manager: z.string().optional(), // required for Super Admin; resolved in controller
  supervisor: z.string().nullable().optional(), // site material custodian; "" / null clears
  image: z.string().optional(),
};

export const createProjectSchema = z.object(fields);

export const updateProjectSchema = z
  .object({ ...fields, name: fields.name.optional() })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });
