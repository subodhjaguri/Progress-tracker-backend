import mongoose from "mongoose";
import { baseSchema } from "./plugins/base.js";
import { SUBTASK_STATUS } from "../constants/enums.js";

// A weighted sub-task under a Work Order. Progress on the parent WO is computed
// from completed subtasks (hybrid: user-assigned weight when provided, otherwise equal-weight).
const subTaskSchema = new mongoose.Schema({
  workOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "WorkOrder",
    required: true,
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  weight: { type: Number, default: null, min: 0, max: 100 }, // null = equal-weight mode
  status: { type: String, enum: SUBTASK_STATUS, default: "Not Started" },
  completedAt: { type: Date, default: null },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  sortOrder: { type: Number, default: 0 },
});

baseSchema(subTaskSchema);
subTaskSchema.index({ workOrderId: 1, sortOrder: 1 });

export const SubTask = mongoose.model("SubTask", subTaskSchema);
