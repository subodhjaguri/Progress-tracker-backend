import mongoose from "mongoose";
import { baseSchema } from "./plugins/base.js";
import { ATTENDANCE_STATUS } from "../constants/enums.js";

// One record per labour per day (day-bucketed by UTC calendar date).
const attendanceSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  labour: { type: mongoose.Schema.Types.ObjectId, ref: "Labour", required: true },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  contractor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  workOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "WorkOrder",
    default: null,
  },
  status: { type: String, enum: ATTENDANCE_STATUS, required: true },
  remarks: { type: String, default: null },
});

baseSchema(attendanceSchema);
// Business rule: one attendance record per labour per day.
attendanceSchema.index(
  { labour: 1, date: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
attendanceSchema.index({ project: 1, date: 1 });
attendanceSchema.index({ supervisor: 1, date: 1 });
attendanceSchema.index({ contractor: 1, date: 1 });

export const Attendance = mongoose.model("Attendance", attendanceSchema);
