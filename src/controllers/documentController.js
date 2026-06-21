import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { Document } from "../models/Document.js";
import { Project } from "../models/Project.js";
import { WorkOrder } from "../models/WorkOrder.js";
import { Labour } from "../models/Labour.js";
import { User } from "../models/User.js";
import { ROLES } from "../constants/enums.js";
import { storage } from "../services/storage/index.js";
import {
  projectScopeFilter,
  workOrderScopeFilter,
  labourScopeFilter,
  contractorIdsVisibleToManager,
} from "../services/access.js";

const scoped = (scope, id) =>
  Object.keys(scope).length ? { $and: [scope, { _id: id }] } : { _id: id };

// Throws unless the user may access the document's parent.
async function assertParentAccessible(user, parentType, parentId) {
  if (!mongoose.isValidObjectId(parentId)) {
    throw ApiError.badRequest("Invalid parent id");
  }
  if (parentType === "Project") {
    const scope = await projectScopeFilter(user);
    if (!(await Project.findOne(scoped(scope, parentId)))) {
      throw ApiError.notFound("Project not found");
    }
  } else if (parentType === "WorkOrder") {
    const scope = await workOrderScopeFilter(user);
    if (!(await WorkOrder.findOne(scoped(scope, parentId)))) {
      throw ApiError.notFound("Work order not found");
    }
  } else if (parentType === "Labour") {
    const scope = await labourScopeFilter(user);
    if (!(await Labour.findOne(scoped(scope, parentId)))) {
      throw ApiError.notFound("Labour not found");
    }
  } else if (parentType === "Contractor") {
    const contractor = await User.findOne({
      _id: parentId,
      role: ROLES.CONTRACTOR,
    });
    if (!contractor) throw ApiError.notFound("Contractor not found");
    if (user.role === ROLES.SUPER_ADMIN) return;
    if (user.role === ROLES.MANAGER) {
      const ids = await contractorIdsVisibleToManager(user._id);
      if (!ids.has(contractor._id.toString())) throw ApiError.forbidden();
    } else if (!contractor._id.equals(user._id)) {
      throw ApiError.forbidden();
    }
  } else {
    throw ApiError.badRequest("Invalid parent type");
  }
}

function buildKey(parentType, originalName) {
  const safe = (originalName || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 60);
  return `documents/${parentType}/${randomBytes(8).toString("hex")}_${safe}`;
}

export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("A file is required");
  const { parentType, parentId, category, progressUpdateId } = req.body;
  await assertParentAccessible(req.user, parentType, parentId);

  const key = buildKey(parentType, req.file.originalname);
  await storage.save({
    buffer: req.file.buffer,
    key,
    contentType: req.file.mimetype,
  });

  const doc = await Document.create({
    parentType,
    parentId,
    category,
    progressUpdateId:
      progressUpdateId && mongoose.isValidObjectId(progressUpdateId)
        ? progressUpdateId
        : null,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    storageKey: key,
    isSensitive: req.body.isSensitive === "true",
    uploadedBy: req.user._id,
    createdBy: req.user._id,
  });
  await doc.populate("uploadedBy", "name role");
  sendCreated(res, doc);
});

export const listDocuments = asyncHandler(async (req, res) => {
  const { parentType, parentId } = req.query;
  if (!parentType || !parentId) {
    throw ApiError.badRequest("parentType and parentId are required");
  }
  await assertParentAccessible(req.user, parentType, parentId);
  const docs = await Document.find({ parentType, parentId })
    .populate("uploadedBy", "name role")
    .sort({ createdAt: -1 });
  sendSuccess(res, docs);
});

export const downloadDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) throw ApiError.notFound("Document not found");
  await assertParentAccessible(req.user, doc.parentType, doc.parentId);

  res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${doc.originalName.replace(/"/g, "")}"`,
  );
  const stream = await storage.createReadStream(doc.storageKey);
  stream.on("error", () => {
    if (!res.headersSent) res.status(500).end();
  });
  stream.pipe(res);
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) throw ApiError.notFound("Document not found");
  await assertParentAccessible(req.user, doc.parentType, doc.parentId);

  const isUploader = doc.uploadedBy.equals(req.user._id);
  const isAdmin =
    req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.MANAGER;
  if (!isUploader && !isAdmin) throw ApiError.forbidden();

  doc.isDeleted = true;
  doc.deletedAt = new Date();
  await doc.save();
  sendSuccess(res, { message: "Document removed" });
});
