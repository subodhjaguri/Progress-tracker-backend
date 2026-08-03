import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { WorkOrder } from "../models/WorkOrder.js";
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";
import { ROLES } from "../constants/enums.js";
import { nextCode } from "../services/code.js";
import { workOrderScopeFilter } from "../services/access.js";

const USER_VIEW = "name mobile role";

async function validateSupervisor(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw ApiError.badRequest("Valid supervisor is required");
  }
  const s = await User.findOne({ _id: id, role: ROLES.SUPERVISOR });
  if (!s) throw ApiError.badRequest("Supervisor not found");
  return s._id;
}

async function validateContractor(id) {
  if (!id) return null;
  if (!mongoose.isValidObjectId(id)) {
    throw ApiError.badRequest("Valid contractor is required");
  }
  const c = await User.findOne({ _id: id, role: ROLES.CONTRACTOR });
  if (!c) throw ApiError.badRequest("Contractor not found");
  return c._id;
}

async function validateReporter(id) {
  if (!id) return null;
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest("Invalid reporter");
  const r = await User.findById(id);
  if (!r) throw ApiError.badRequest("Reporter not found");
  return r._id;
}

async function populateWorkOrder(wo) {
  return wo.populate([
    { path: "projectId", select: "name code" },
    { path: "supervisor", select: USER_VIEW },
    { path: "contractor", select: USER_VIEW },
  ]);
}

export const createWorkOrder = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!mongoose.isValidObjectId(b.projectId)) {
    throw ApiError.badRequest("Invalid project");
  }
  const project = await Project.findById(b.projectId);
  if (!project) throw ApiError.badRequest("Project not found");
  if (req.user.role === ROLES.MANAGER && !project.manager.equals(req.user._id)) {
    throw ApiError.forbidden("You can only add work orders to your own projects");
  }

  const supervisor = await validateSupervisor(b.supervisor);
  const contractor = await validateContractor(b.contractor);
  const reporter = await validateReporter(b.reporter);
  const code = await nextCode("workOrder");
  const wo = await WorkOrder.create({
    code,
    projectId: project._id,
    title: b.title,
    description: b.description ?? null,
    supervisor,
    contractor,
    reporter,
    priority: b.priority ?? "Medium",
    dueDate: b.dueDate ?? null,
    status: b.status ?? "Not Started",
    progress: 0,
    weightagePercentage: b.weightagePercentage ?? 0,
    createdBy: req.user._id,
  });
  await populateWorkOrder(wo);
  sendCreated(res, wo);
});

export const listWorkOrders = asyncHandler(async (req, res) => {
  const ands = [];
  const scope = await workOrderScopeFilter(req.user);
  if (Object.keys(scope).length) ands.push(scope);
  if (req.query.project && mongoose.isValidObjectId(req.query.project)) {
    ands.push({ projectId: req.query.project });
  }
  if (req.query.supervisor && mongoose.isValidObjectId(req.query.supervisor)) {
    ands.push({ supervisor: req.query.supervisor });
  }
  if (req.query.contractor && mongoose.isValidObjectId(req.query.contractor)) {
    ands.push({ contractor: req.query.contractor });
  }
  if (req.query.status) ands.push({ status: req.query.status });
  if (req.query.priority) ands.push({ priority: req.query.priority });
  const filter = ands.length ? { $and: ands } : {};

  const orders = await WorkOrder.find(filter)
    .populate("projectId", "name code")
    .populate("supervisor", USER_VIEW)
    .populate("contractor", USER_VIEW)
    .sort({ createdAt: -1 });
  sendSuccess(res, orders);
});

export const getWorkOrder = asyncHandler(async (req, res) => {
  const scope = await workOrderScopeFilter(req.user);
  const filter = Object.keys(scope).length
    ? { $and: [scope, { _id: req.params.id }] }
    : { _id: req.params.id };
  const wo = await WorkOrder.findOne(filter)
    .populate("projectId", "name code")
    .populate("supervisor", USER_VIEW)
    .populate("contractor", USER_VIEW)
    .populate("reporter", "name role");
  if (!wo) throw ApiError.notFound("Work order not found");
  sendSuccess(res, wo);
});

export const updateWorkOrder = asyncHandler(async (req, res) => {
  const scope = await workOrderScopeFilter(req.user);
  const filter = Object.keys(scope).length
    ? { $and: [scope, { _id: req.params.id }] }
    : { _id: req.params.id };
  const wo = await WorkOrder.findOne(filter);
  if (!wo) throw ApiError.notFound("Work order not found");

  const b = req.body;
  for (const f of ["title", "description", "priority", "dueDate", "status", "progress", "weightagePercentage"]) {
    if (f in b) wo[f] = b[f];
  }
  if ("supervisor" in b) wo.supervisor = await validateSupervisor(b.supervisor);
  if ("contractor" in b) wo.contractor = await validateContractor(b.contractor);
  if ("reporter" in b) wo.reporter = await validateReporter(b.reporter);
  if ("status" in b || "progress" in b) wo.lastUpdateAt = new Date();
  await wo.save();
  await populateWorkOrder(wo);
  sendSuccess(res, wo);
});
