import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { LabourTask } from "../models/LabourTask.js";
import { WorkOrder } from "../models/WorkOrder.js";
import { workOrderScopeFilter } from "../services/access.js";

// Read: anyone who can see the work order. Write: the assigned contractor only.

export const listLabourTasks = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw ApiError.badRequest("Invalid work order");
  }
  const scope = await workOrderScopeFilter(req.user);
  const filter = Object.keys(scope).length
    ? { $and: [scope, { _id: req.params.id }] }
    : { _id: req.params.id };
  const wo = await WorkOrder.findOne(filter);
  if (!wo) throw ApiError.notFound("Work order not found");

  const tasks = await LabourTask.find({ workOrderId: wo._id })
    .populate("assignedLabour", "name skill")
    .sort({ createdAt: -1 });
  sendSuccess(res, tasks);
});

async function assertAssignedContractor(req, workOrderId) {
  const wo = await WorkOrder.findById(workOrderId);
  if (!wo) throw ApiError.notFound("Work order not found");
  if (!wo.contractor.equals(req.user._id)) {
    throw ApiError.forbidden("Only the assigned contractor can manage labour tasks");
  }
  return wo;
}

export const createLabourTask = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw ApiError.badRequest("Invalid work order");
  }
  const wo = await assertAssignedContractor(req, req.params.id);
  const b = req.body;
  const task = await LabourTask.create({
    workOrderId: wo._id,
    title: b.title,
    status: b.status ?? "Not Started",
    assignedLabour: b.assignedLabour ?? [],
    note: b.note ?? null,
    createdBy: req.user._id,
  });
  sendCreated(res, task);
});

async function loadOwnedTask(req) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw ApiError.badRequest("Invalid labour task");
  }
  const task = await LabourTask.findById(req.params.id);
  if (!task) throw ApiError.notFound("Labour task not found");
  await assertAssignedContractor(req, task.workOrderId);
  return task;
}

export const updateLabourTask = asyncHandler(async (req, res) => {
  const task = await loadOwnedTask(req);
  for (const f of ["title", "status", "assignedLabour", "note"]) {
    if (f in req.body) task[f] = req.body[f];
  }
  await task.save();
  sendSuccess(res, task);
});

export const deleteLabourTask = asyncHandler(async (req, res) => {
  const task = await loadOwnedTask(req);
  task.isDeleted = true;
  task.deletedAt = new Date();
  await task.save();
  sendSuccess(res, { message: "Labour task removed" });
});
