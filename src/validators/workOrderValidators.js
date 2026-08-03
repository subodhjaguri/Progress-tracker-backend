import { z } from "zod";
import { enumOf } from "./helpers.js";
import { WORK_ORDER_STATUS, PRIORITY } from "../constants/enums.js";

export const createWorkOrderSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  supervisor: z.string().min(1, "Supervisor is required"),
  contractor: z.string().min(1, "Contractor is required"),
  reporter: z.string().optional(),
  priority: enumOf(PRIORITY).optional(),
  dueDate: z.coerce.date().optional(),
  status: enumOf(WORK_ORDER_STATUS).optional(),
  weightagePercentage: z.coerce.number().min(0).max(100).optional(),
});

export const updateWorkOrderSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    supervisor: z.string().optional(),
    contractor: z.string().optional(),
    reporter: z.string().optional(),
    priority: enumOf(PRIORITY).optional(),
    dueDate: z.coerce.date().optional(),
    status: enumOf(WORK_ORDER_STATUS).optional(),
    progress: z.coerce.number().min(0).max(100).optional(),
    weightagePercentage: z.coerce.number().min(0).max(100).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });
