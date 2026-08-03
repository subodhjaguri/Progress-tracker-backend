import { z } from "zod";
import { enumOf } from "./helpers.js";
import { ATTENDANCE_STATUS } from "../constants/enums.js";

export const markAttendanceSchema = z.object({
  date: z.coerce.date(),
  project: z.string().min(1, "Project is required"),
  workOrder: z.string().optional().nullable(),
  entries: z
    .array(
      z.object({
        labour: z.string().min(1),
        status: enumOf(ATTENDANCE_STATUS),
        remarks: z.string().optional(),
      }),
    )
    .min(1, "At least one attendance entry is required"),
});
