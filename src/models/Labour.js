import mongoose from "mongoose";
import { baseSchema } from "./plugins/base.js";
import { SKILLS } from "../constants/enums.js";
import { maskAadhaar } from "../utils/mask.js";

// Labour belongs to a Contractor and has no login. Managed by the contractor.
const labourSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, default: null },
  aadhaarNumber: { type: String, default: null }, // sensitive — masked in responses
  skill: { type: String, enum: SKILLS, required: true },
  contractor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

baseSchema(labourSchema, {
  scrub(ret) {
    if (ret.aadhaarNumber) ret.aadhaarNumber = maskAadhaar(ret.aadhaarNumber);
  },
});

labourSchema.index({ contractor: 1 });
labourSchema.index({ skill: 1 });

export const Labour = mongoose.model("Labour", labourSchema);
