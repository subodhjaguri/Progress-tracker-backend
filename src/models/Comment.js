import mongoose from "mongoose";
import { baseSchema } from "./plugins/base.js";
import { COMMENT_PARENT_TYPES } from "../constants/enums.js";

// Flat, chat-style comments on a Work Order or Project.
const commentSchema = new mongoose.Schema({
  parentType: { type: String, enum: COMMENT_PARENT_TYPES, required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
});

baseSchema(commentSchema);
commentSchema.index({ parentType: 1, parentId: 1, createdAt: 1 });

export const Comment = mongoose.model("Comment", commentSchema);
