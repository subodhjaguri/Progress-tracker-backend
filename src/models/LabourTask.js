import mongoose from "mongoose";
import { baseSchema } from "./plugins/base.js";
import { LABOUR_TASK_STATUS } from "../constants/enums.js";

// Optional child task under a Work Order, created/managed by the assigned contractor.
const labourTaskSchema = new mongoose.Schema({
  workOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "WorkOrder",
    required: true,
  },
  title: { type: String, required: true, trim: true },
  status: { type: String, enum: LABOUR_TASK_STATUS, default: "Not Started" },
  assignedLabour: [{ type: mongoose.Schema.Types.ObjectId, ref: "Labour" }],
  note: { type: String, default: null },
});

baseSchema(labourTaskSchema);
labourTaskSchema.index({ workOrderId: 1 });

export const LabourTask = mongoose.model("LabourTask", labourTaskSchema);
