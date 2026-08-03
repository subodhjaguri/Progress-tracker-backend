import mongoose from "mongoose";
import { baseSchema } from "./plugins/base.js";
import { WORK_ORDER_STATUS, PRIORITY } from "../constants/enums.js";

const workOrderSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // WO-001
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  // Active operational owner (Supervisor)
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Passive billing/record reference (Contractor)
  contractor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  priority: { type: String, enum: PRIORITY, default: "Medium" },
  dueDate: { type: Date, default: null },
  status: { type: String, enum: WORK_ORDER_STATUS, default: "Not Started" },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  weightagePercentage: { type: Number, default: 0, min: 0, max: 100 },
  lastUpdateAt: { type: Date, default: null },
});

baseSchema(workOrderSchema);
workOrderSchema.index({ projectId: 1 });
workOrderSchema.index({ supervisor: 1 });
workOrderSchema.index({ contractor: 1 });
workOrderSchema.index({ status: 1 });
workOrderSchema.index({ projectId: 1, status: 1 });

export const WorkOrder = mongoose.model("WorkOrder", workOrderSchema);
