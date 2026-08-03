import mongoose from "mongoose";
import { baseSchema } from "./plugins/base.js";
import { DOC_PARENT_TYPES, DOC_CATEGORY } from "../constants/enums.js";

// Unified, polymorphic attachment. parentId points at a Project / WorkOrder /
// Contractor(User) / Labour. Photos are documents with category "Site Photo".
const documentSchema = new mongoose.Schema({
  parentType: { type: String, enum: DOC_PARENT_TYPES, required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  category: { type: String, enum: DOC_CATEGORY, required: true },
  progressUpdateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProgressUpdate",
    default: null,
  },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  storageKey: { type: String, required: true }, // internal — scrubbed from responses
  isSensitive: { type: Boolean, default: false },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // 2-Stage Approval Pipeline for Engineering / Technical Documents
  superAdminApproval: {
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    note: { type: String, default: null },
  },
  managerApproval: {
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    note: { type: String, default: null },
  },
});

baseSchema(documentSchema, {
  scrub(ret) {
    delete ret.storageKey; // never expose the storage path/key to clients
  },
});

documentSchema.index({ parentType: 1, parentId: 1 });
documentSchema.index({ progressUpdateId: 1 });

export const Document = mongoose.model("Document", documentSchema);
