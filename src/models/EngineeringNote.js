import mongoose from "mongoose";
import { baseSchema } from "./plugins/base.js";

const engineeringNoteSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ["Site Description & Summary", "Design Specs & Architectural", "Structural Analysis & Audit", "Other"],
    default: "Site Description & Summary",
  },
  content: {
    type: String,
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

baseSchema(engineeringNoteSchema);
engineeringNoteSchema.index({ project: 1, createdAt: -1 });

export const EngineeringNote = mongoose.model("EngineeringNote", engineeringNoteSchema);
