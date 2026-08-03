import mongoose from "mongoose";
import { baseSchema } from "./plugins/base.js";

const paymentSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  type: {
    type: String,
    enum: ["Labour", "Contractor", "Miscellaneous"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  date: {
    type: Date,
    default: Date.now,
    required: true,
  },
  status: {
    type: String,
    enum: ["Requested", "Approved", "Paid", "Rejected"],
    default: "Requested",
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  contractor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  labourCount: {
    type: Number,
    default: 0,
  },
  proofNotes: {
    type: String,
    default: null,
  },
  attachment: {
    type: String,
    default: null,
  },
});

baseSchema(paymentSchema);
paymentSchema.index({ project: 1, date: -1 });
paymentSchema.index({ type: 1, status: 1 });

export const Payment = mongoose.model("Payment", paymentSchema);
