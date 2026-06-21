import mongoose from "mongoose";
import { baseSchema } from "./plugins/base.js";
import { WORK_ORDER_STATUS } from "../constants/enums.js";

// A daily progress update on a Work Order. Posting one also syncs the work order's
// progress/status/lastUpdateAt (see controller).
const progressUpdateSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  workOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "WorkOrder",
    required: true,
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  note: { type: String, required: true },
  progress: { type: Number, min: 0, max: 100, default: null },
  status: { type: String, enum: WORK_ORDER_STATUS, default: null },
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
});

baseSchema(progressUpdateSchema);
progressUpdateSchema.index({ workOrderId: 1, date: -1 });
progressUpdateSchema.index({ projectId: 1, date: -1 });

export const ProgressUpdate = mongoose.model("ProgressUpdate", progressUpdateSchema);
