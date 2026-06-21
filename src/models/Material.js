import mongoose from "mongoose";
import { baseSchema } from "./plugins/base.js";
import { MATERIAL_TYPE } from "../constants/enums.js";

// A material movement (ledger entry). No computed stock balance (PRD §21).
const materialSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  materialName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  type: { type: String, enum: MATERIAL_TYPE, required: true },
  party: { type: String, default: null }, // supplier or contractor name
  contractor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  note: { type: String, default: null },
});

baseSchema(materialSchema);
materialSchema.index({ project: 1, date: -1 });

export const Material = mongoose.model("Material", materialSchema);
