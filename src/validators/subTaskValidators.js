import { z } from "zod";
import { enumOf } from "./helpers.js";
import { SUBTASK_STATUS } from "../constants/enums.js";

export const createSubTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  weight: z.coerce.number().min(0).max(100).optional().nullable(),
  status: enumOf(SUBTASK_STATUS).optional(),
});

export const updateSubTaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    weight: z.coerce.number().min(0).max(100).optional().nullable(),
    status: enumOf(SUBTASK_STATUS).optional(),
    sortOrder: z.coerce.number().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });
