import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { SubTask } from "../models/SubTask.js";
import { WorkOrder } from "../models/WorkOrder.js";
import { workOrderScopeFilter } from "../services/access.js";

/**
 * Recalculate parent Work Order progress based on its non-deleted subtasks.
 * Hybrid logic:
 *   - If any subtask has a weight assigned: progress = sum of completed weights.
 *   - Otherwise: progress = (completed count / total count) * 100.
 */
export async function recalculateWorkOrderProgress(workOrderId) {
  const subtasks = await SubTask.find({ workOrderId, isDeleted: { $ne: true } });
  if (subtasks.length === 0) return; // Leave WO progress as-is if no subtasks exist

  const completed = subtasks.filter((s) => s.status === "Completed");
  const hasWeighted = subtasks.some((s) => s.weight !== null && s.weight !== undefined);

  let progress = 0;
  if (hasWeighted) {
    progress = completed.reduce((sum, s) => sum + (s.weight || 0), 0);
  } else {
    progress = Math.round((completed.length / subtasks.length) * 100);
  }

  // Clamp 0-100
  progress = Math.min(100, Math.max(0, progress));

  const update = { progress, lastUpdateAt: new Date() };
  if (progress === 100) update.status = "Completed";
  else if (progress > 0) update.status = "In Progress";

  await WorkOrder.findByIdAndUpdate(workOrderId, { $set: update });
}

export const listSubTasks = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw ApiError.badRequest("Invalid work order ID");
  }
  const scope = await workOrderScopeFilter(req.user);
  const filter = Object.keys(scope).length
    ? { $and: [scope, { _id: req.params.id }] }
    : { _id: req.params.id };
  const wo = await WorkOrder.findOne(filter);
  if (!wo) throw ApiError.notFound("Work order not found");

  const subtasks = await SubTask.find({ workOrderId: wo._id }).sort({ sortOrder: 1, createdAt: 1 });
  sendSuccess(res, subtasks);
});

export const createSubTask = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw ApiError.badRequest("Invalid work order ID");
  }
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) throw ApiError.notFound("Work order not found");

  const b = req.body;
  if (b.weight !== undefined && b.weight !== null) {
    const existing = await SubTask.find({ workOrderId: wo._id, isDeleted: { $ne: true } });
    const currentTotalWeight = existing.reduce((sum, s) => sum + (s.weight || 0), 0);
    if (currentTotalWeight + Number(b.weight) > 100) {
      throw ApiError.badRequest(
        `Total weight cannot exceed 100%. Current sum: ${currentTotalWeight}%, adding: ${b.weight}%`,
      );
    }
  }

  const subtask = await SubTask.create({
    workOrderId: wo._id,
    title: b.title,
    description: b.description ?? null,
    weight: b.weight ?? null,
    status: b.status ?? "Not Started",
    createdBy: req.user._id,
  });

  await recalculateWorkOrderProgress(wo._id);
  sendCreated(res, subtask);
});

export const updateSubTask = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.subId)) {
    throw ApiError.badRequest("Invalid subtask ID");
  }
  const subtask = await SubTask.findById(req.params.subId);
  if (!subtask) throw ApiError.notFound("Subtask not found");

  const b = req.body;
  if ("title" in b) subtask.title = b.title;
  if ("description" in b) subtask.description = b.description;
  if ("weight" in b) subtask.weight = b.weight;
  if ("sortOrder" in b) subtask.sortOrder = b.sortOrder;

  if ("status" in b) {
    subtask.status = b.status;
    if (b.status === "Completed") {
      subtask.completedAt = new Date();
      subtask.completedBy = req.user._id;
    } else {
      subtask.completedAt = null;
      subtask.completedBy = null;
    }
  }

  await subtask.save();
  await recalculateWorkOrderProgress(subtask.workOrderId);
  sendSuccess(res, subtask);
});

export const deleteSubTask = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.subId)) {
    throw ApiError.badRequest("Invalid subtask ID");
  }
  const subtask = await SubTask.findById(req.params.subId);
  if (!subtask) throw ApiError.notFound("Subtask not found");

  subtask.isDeleted = true;
  subtask.deletedAt = new Date();
  await subtask.save();

  await recalculateWorkOrderProgress(subtask.workOrderId);
  sendSuccess(res, { message: "Subtask removed" });
});
