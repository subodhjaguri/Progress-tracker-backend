import mongoose from "mongoose";
import { baseSchema } from "./plugins/base.js";
import { PROJECT_STATUS } from "../constants/enums.js";

const projectSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // PRJ-001
  name: { type: String, required: true, trim: true },
  clientName: { type: String, default: null },
  clientMobile: { type: String, default: null },
  siteName: { type: String, default: null },
  siteLocation: { type: String, default: null },
  siteAddress: { type: String, default: null },
  description: { type: String, default: null },
  startDate: { type: Date, default: null },
  targetDate: { type: Date, default: null },
  status: { type: String, enum: PROJECT_STATUS, default: "Planning" },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Site-level material custodian (role SUPERVISOR). Optional; one per project.
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  // Site engineers assigned to project (role ENGINEER). Optional; multiple per project.
  engineers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  image: { type: String, default: null },
});

baseSchema(projectSchema);
projectSchema.index({ manager: 1 });
projectSchema.index({ supervisor: 1 });
projectSchema.index({ engineers: 1 });
projectSchema.index({ status: 1 });

// `progress` is computed from work orders (see services/rollups.js), not stored.

export const Project = mongoose.model("Project", projectSchema);
