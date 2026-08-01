import mongoose from "mongoose";
import { baseSchema } from "./plugins/base.js";
import { SKILLS } from "../constants/enums.js";
import { maskAadhaar } from "../utils/mask.js";

// Labour belongs to a Supervisor (who manages them) with optional contractor ref. Managed by supervisor.
const labourSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, default: null },
  aadhaarNumber: { type: String, default: null }, // sensitive — masked in responses
  skill: { type: String, enum: SKILLS, required: true },
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
});

baseSchema(labourSchema, {
  scrub(ret) {
    if (ret.aadhaarNumber) ret.aadhaarNumber = maskAadhaar(ret.aadhaarNumber);
  },
});

labourSchema.index({ supervisor: 1 });
labourSchema.index({ contractor: 1 });
labourSchema.index({ skill: 1 });

export const Labour = mongoose.model("Labour", labourSchema);
