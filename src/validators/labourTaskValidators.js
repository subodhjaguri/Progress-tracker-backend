import { z } from "zod";
import { enumOf } from "./helpers.js";
import { LABOUR_TASK_STATUS } from "../constants/enums.js";

export const createLabourTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  status: enumOf(LABOUR_TASK_STATUS).optional(),
  assignedLabour: z.array(z.string()).optional(),
  note: z.string().optional(),
});

export const updateLabourTaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    status: enumOf(LABOUR_TASK_STATUS).optional(),
    assignedLabour: z.array(z.string()).optional(),
    note: z.string().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });
