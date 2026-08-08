import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { EngineeringNote } from "../models/EngineeringNote.js";
import { Project } from "../models/Project.js";
import {
  visibleProjectIds,
  assertProjectScope,
  assertProjectScopeById,
} from "../services/access.js";

export const createEngineeringNote = asyncHandler(async (req, res) => {
  const { project, title, category, content, attachments } = req.body;
  if (!mongoose.isValidObjectId(project)) {
    throw ApiError.badRequest("Invalid project id");
  }
  const proj = await Project.findById(project);
  if (!proj) throw ApiError.badRequest("Project not found");
  assertProjectScope(req.user, proj);

  const note = await EngineeringNote.create({
    project: proj._id,
    title,
    category: category || "Site Description & Summary",
    content,
    attachments: Array.isArray(attachments) ? attachments : [],
    author: req.user._id,
  });

  await note.populate([
    { path: "project", select: "name code" },
    { path: "author", select: "name role" },
  ]);

  sendCreated(res, note);
});

export const listEngineeringNotes = asyncHandler(async (req, res) => {
  const ands = [];
  // `?project=` is a client-supplied filter, not a permission — intersect it with
  // the projects this user may actually see.
  const ids = await visibleProjectIds(req.user);
  if (ids !== null) ands.push({ project: { $in: ids } });
  if (req.query.project && mongoose.isValidObjectId(req.query.project)) {
    ands.push({ project: req.query.project });
  }
  const filter = ands.length ? { $and: ands } : {};

  const notes = await EngineeringNote.find(filter)
    .populate("project", "name code")
    .populate("author", "name role")
    .sort({ createdAt: -1 });

  sendSuccess(res, notes);
});

export const deleteEngineeringNote = asyncHandler(async (req, res) => {
  const note = await EngineeringNote.findById(req.params.id);
  if (!note) throw ApiError.notFound("Engineering note not found");

  await assertProjectScopeById(req.user, note.project);

  // Soft delete, matching every other resource (document/labour/labour task).
  note.isDeleted = true;
  note.deletedAt = new Date();
  await note.save();

  sendSuccess(res, { id: req.params.id });
});
