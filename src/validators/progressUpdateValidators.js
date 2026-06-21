import { z } from "zod";
import { enumOf } from "./helpers.js";
import { WORK_ORDER_STATUS } from "../constants/enums.js";

export const createProgressUpdateSchema = z.object({
  note: z.string().min(1, "Update note is required"),
  progress: z.coerce.number().min(0).max(100).optional(),
  status: enumOf(WORK_ORDER_STATUS).optional(),
  date: z.coerce.date().optional(),
});
