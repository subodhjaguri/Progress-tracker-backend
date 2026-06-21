import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { Comment } from "../models/Comment.js";
import { WorkOrder } from "../models/WorkOrder.js";
import { Project } from "../models/Project.js";
import { workOrderScopeFilter, projectScopeFilter } from "../services/access.js";

// Ensure the user can see the parent (work order / project) before reading/writing comments.
async function assertParentVisible(user, parentType, parentId) {
  if (!mongoose.isValidObjectId(parentId)) {
    throw ApiError.badRequest("Invalid parent id");
  }
  if (parentType === "WorkOrder") {
    const scope = await workOrderScopeFilter(user);
    const filter = Object.keys(scope).length
      ? { $and: [scope, { _id: parentId }] }
      : { _id: parentId };
    if (!(await WorkOrder.findOne(filter))) {
      throw ApiError.notFound("Work order not found");
    }
  } else if (parentType === "Project") {
    const scope = await projectScopeFilter(user);
    const filter = Object.keys(scope).length
      ? { $and: [scope, { _id: parentId }] }
      : { _id: parentId };
    if (!(await Project.findOne(filter))) {
      throw ApiError.notFound("Project not found");
    }
  } else {
    throw ApiError.badRequest("Invalid parent type");
  }
}

export const createComment = asyncHandler(async (req, res) => {
  const { parentType, parentId, text } = req.body;
  await assertParentVisible(req.user, parentType, parentId);
  const comment = await Comment.create({
    parentType,
    parentId,
    text,
    author: req.user._id,
    createdBy: req.user._id,
  });
  await comment.populate("author", "name role");
  sendCreated(res, comment);
});

export const listComments = asyncHandler(async (req, res) => {
  const { parentType, parentId } = req.query;
  if (!parentType || !parentId) {
    throw ApiError.badRequest("parentType and parentId are required");
  }
  await assertParentVisible(req.user, parentType, parentId);
  const comments = await Comment.find({ parentType, parentId })
    .populate("author", "name role")
    .sort({ createdAt: 1 }); // chat timeline
  sendSuccess(res, comments);
});
