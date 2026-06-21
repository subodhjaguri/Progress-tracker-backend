import mongoose from "mongoose";

// Simple atomic sequence store for human-readable codes (PRJ-001, WO-001).
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "project", "workOrder"
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model("Counter", counterSchema);
