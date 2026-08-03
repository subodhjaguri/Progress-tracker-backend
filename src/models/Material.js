import mongoose from "mongoose";
import { baseSchema } from "./plugins/base.js";
import { MATERIAL_TYPE, MATERIAL_RECEIPT_STATUS } from "../constants/enums.js";

// A material movement (ledger entry). No computed stock balance (PRD §21).
// Received = Manager hands over to the site Supervisor (awaits confirmation);
// Used = Supervisor logs daily consumption; Issued = direct issue to a Contractor.
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

  // Material Request & Delivery Lifecycle: Requested -> Provided -> Acknowledged
  status: {
    type: String,
    enum: ["Requested", "Provided", "Acknowledged", "Used", "Issued"],
    default: "Used",
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  providedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  providedAt: { type: Date, default: null },
  acknowledgedAt: { type: Date, default: null },

  // Receipt confirmation — set on `Received` entries only (null otherwise).
  receiptStatus: { type: String, enum: MATERIAL_RECEIPT_STATUS, default: null },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  confirmedAt: { type: Date, default: null },
  receiptNote: { type: String, default: null },
});

baseSchema(materialSchema);
materialSchema.index({ project: 1, date: -1 });
materialSchema.index({ project: 1, type: 1, date: -1 });
materialSchema.index({ receiptStatus: 1 });

export const Material = mongoose.model("Material", materialSchema);
