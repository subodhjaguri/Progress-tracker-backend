import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { ProgressUpdate } from "../models/ProgressUpdate.js";
import { WorkOrder } from "../models/WorkOrder.js";
import { workOrderScopeFilter } from "../services/access.js";

// Load a work order the user is allowed to act on (scope == who may update it).
async function loadVisibleWorkOrder(req) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw ApiError.badRequest("Invalid work order");
  }
  const scope = await workOrderScopeFilter(req.user);
  const filter = Object.keys(scope).length
    ? { $and: [scope, { _id: req.params.id }] }
    : { _id: req.params.id };
  const wo = await WorkOrder.findOne(filter);
  if (!wo) throw ApiError.notFound("Work order not found");
  return wo;
}

export const listProgressUpdates = asyncHandler(async (req, res) => {
  const wo = await loadVisibleWorkOrder(req);
  const updates = await ProgressUpdate.find({ workOrderId: wo._id })
    .populate("author", "name role")
    .sort({ date: -1 });
  sendSuccess(res, updates);
});

export const createProgressUpdate = asyncHandler(async (req, res) => {
  const wo = await loadVisibleWorkOrder(req);
  const b = req.body;
  const when = b.date ?? new Date();

  const update = await ProgressUpdate.create({
    projectId: wo.projectId,
    workOrderId: wo._id,
    author: req.user._id,
    date: when,
    note: b.note,
    progress: b.progress ?? null,
    status: b.status ?? null,
    createdBy: req.user._id,
  });

  // Sync the work order with the latest update.
  if (b.progress != null) wo.progress = b.progress;
  if (b.status) wo.status = b.status;
  wo.lastUpdateAt = when;
  await wo.save();

  await update.populate("author", "name role");
  sendCreated(res, update);
});
