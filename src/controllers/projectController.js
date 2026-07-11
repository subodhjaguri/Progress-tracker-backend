import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { Project } from "../models/Project.js";
import { WorkOrder } from "../models/WorkOrder.js";
import { User } from "../models/User.js";
import { ROLES } from "../constants/enums.js";
import { nextCode } from "../services/code.js";
import { progressByProject, projectSummary } from "../services/rollups.js";
import {
  projectScopeFilter,
  supervisorIdsVisibleToManager,
} from "../services/access.js";

const MANAGER_VIEW = "name mobile role";

// Managers always own the projects they create; Super Admin assigns one.
async function resolveManager(body, actor) {
  if (actor.role === ROLES.MANAGER) return actor._id;
  if (!body.manager || !mongoose.isValidObjectId(body.manager)) {
    throw ApiError.badRequest("A valid manager is required");
  }
  const mgr = await User.findOne({ _id: body.manager, role: ROLES.MANAGER });
  if (!mgr) throw ApiError.badRequest("Manager not found");
  return mgr._id;
}

/**
 * Resolve the optional supervisor assignment.
 *  - returns `undefined` when `supervisor` isn't in the body (leave unchanged),
 *  - `null` to clear it, or the supervisor's `_id`.
 * A Manager may only assign supervisors visible to them (created or already assigned).
 */
async function resolveSupervisor(body, actor) {
  if (!("supervisor" in body)) return undefined;
  if (!body.supervisor) return null;
  if (!mongoose.isValidObjectId(body.supervisor)) {
    throw ApiError.badRequest("Invalid supervisor");
  }
  const sup = await User.findOne({
    _id: body.supervisor,
    role: ROLES.SUPERVISOR,
  });
  if (!sup) throw ApiError.badRequest("Supervisor not found");
  if (actor.role === ROLES.MANAGER) {
    const ids = await supervisorIdsVisibleToManager(actor._id);
    if (!ids.has(sup._id.toString())) {
      throw ApiError.forbidden("You can only assign supervisors you manage");
    }
  }
  return sup._id;
}

export const createProject = asyncHandler(async (req, res) => {
  const b = req.body;
  const manager = await resolveManager(b, req.user);
  const supervisor = await resolveSupervisor(b, req.user);
  const code = await nextCode("project");
  const project = await Project.create({
    code,
    name: b.name,
    clientName: b.clientName ?? null,
    clientMobile: b.clientMobile ?? null,
    siteName: b.siteName ?? null,
    siteLocation: b.siteLocation ?? null,
    siteAddress: b.siteAddress ?? null,
    description: b.description ?? null,
    startDate: b.startDate ?? null,
    targetDate: b.targetDate ?? null,
    status: b.status ?? "Planning",
    manager,
    supervisor: supervisor ?? null,
    image: b.image ?? null,
    createdBy: req.user._id,
  });
  await project.populate([
    { path: "manager", select: MANAGER_VIEW },
    { path: "supervisor", select: MANAGER_VIEW },
  ]);
  sendCreated(res, { ...project.toJSON(), progress: 0, workOrderCount: 0 });
});

export const listProjects = asyncHandler(async (req, res) => {
  const ands = [];
  const scope = await projectScopeFilter(req.user);
  if (Object.keys(scope).length) ands.push(scope);
  if (req.query.status) ands.push({ status: req.query.status });
  if (req.query.manager && mongoose.isValidObjectId(req.query.manager)) {
    ands.push({ manager: req.query.manager });
  }
  const filter = ands.length ? { $and: ands } : {};

  const projects = await Project.find(filter)
    .populate("manager", MANAGER_VIEW)
    .populate("supervisor", MANAGER_VIEW)
    .sort({ createdAt: -1 });
  const map = await progressByProject(projects.map((p) => p._id));
  const data = projects.map((p) => {
    const info = map.get(p._id.toString());
    return {
      ...p.toJSON(),
      progress: info?.progress ?? 0,
      workOrderCount: info?.workOrders ?? 0,
    };
  });
  sendSuccess(res, data);
});

export const getProject = asyncHandler(async (req, res) => {
  const scope = await projectScopeFilter(req.user);
  const filter = Object.keys(scope).length
    ? { $and: [scope, { _id: req.params.id }] }
    : { _id: req.params.id };
  const project = await Project.findOne(filter)
    .populate("manager", MANAGER_VIEW)
    .populate("supervisor", MANAGER_VIEW);
  if (!project) throw ApiError.notFound("Project not found");

  const summary = await projectSummary(project._id);
  const workOrders = await WorkOrder.find({ projectId: project._id })
    .populate("contractor", MANAGER_VIEW)
    .sort({ createdAt: -1 });
  sendSuccess(res, {
    ...project.toJSON(),
    progress: summary.progress,
    summary,
    workOrders,
  });
});

export const updateProject = asyncHandler(async (req, res) => {
  const scope = await projectScopeFilter(req.user); // SA {} ; manager {manager:self}
  const filter = Object.keys(scope).length
    ? { $and: [scope, { _id: req.params.id }] }
    : { _id: req.params.id };
  const project = await Project.findOne(filter);
  if (!project) throw ApiError.notFound("Project not found");

  const b = req.body;
  for (const f of [
    "name",
    "clientName",
    "clientMobile",
    "siteName",
    "siteLocation",
    "siteAddress",
    "description",
    "startDate",
    "targetDate",
    "status",
    "image",
  ]) {
    if (f in b) project[f] = b[f];
  }
  // Only Super Admin may reassign the manager.
  if ("manager" in b && req.user.role === ROLES.SUPER_ADMIN) {
    if (!mongoose.isValidObjectId(b.manager)) {
      throw ApiError.badRequest("Invalid manager");
    }
    const mgr = await User.findOne({ _id: b.manager, role: ROLES.MANAGER });
    if (!mgr) throw ApiError.badRequest("Manager not found");
    project.manager = mgr._id;
  }
  // Manager (for their own project) or Super Admin may set/clear the supervisor.
  const supervisor = await resolveSupervisor(b, req.user);
  if (supervisor !== undefined) project.supervisor = supervisor;

  await project.save();
  await project.populate([
    { path: "manager", select: MANAGER_VIEW },
    { path: "supervisor", select: MANAGER_VIEW },
  ]);
  const summary = await projectSummary(project._id);
  sendSuccess(res, { ...project.toJSON(), progress: summary.progress, summary });
});
