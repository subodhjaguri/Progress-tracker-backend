import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { Material } from "../models/Material.js";
import { Project } from "../models/Project.js";
import { ROLES } from "../constants/enums.js";
import { visibleProjectIds } from "../services/access.js";

// Which role may record each movement type:
//   Used              → Supervisor (site custodian) or Super Admin
//   Received / Issued  → Manager or Super Admin
function assertCanRecord(role, type) {
  if (type === "Used") {
    if (role !== ROLES.SUPER_ADMIN && role !== ROLES.SUPERVISOR) {
      throw ApiError.forbidden("Only the site supervisor logs material usage");
    }
  } else if (role !== ROLES.SUPER_ADMIN && role !== ROLES.MANAGER) {
    throw ApiError.forbidden("Only a manager records material deliveries");
  }
}

// The current user must be scoped to the project for their role.
function assertProjectScope(user, project) {
  if (user.role === ROLES.MANAGER && !project.manager.equals(user._id)) {
    throw ApiError.forbidden("You can only record materials for your own projects");
  }
  if (user.role === ROLES.SUPERVISOR && !project.supervisor?.equals(user._id)) {
    throw ApiError.forbidden("You can only manage materials for sites you supervise");
  }
}

export const createMaterial = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!mongoose.isValidObjectId(b.project)) {
    throw ApiError.badRequest("Invalid project");
  }
  const project = await Project.findById(b.project);
  if (!project) throw ApiError.badRequest("Project not found");

  assertCanRecord(req.user.role, b.type);
  assertProjectScope(req.user, project);

  let contractor = null;
  if (b.contractor) {
    if (!mongoose.isValidObjectId(b.contractor)) {
      throw ApiError.badRequest("Invalid contractor");
    }
    contractor = b.contractor;
  }

  const material = await Material.create({
    date: b.date,
    project: project._id,
    materialName: b.materialName,
    quantity: b.quantity,
    unit: b.unit,
    type: b.type,
    party: b.party ?? null,
    contractor,
    note: b.note ?? null,
    // A delivery is pending until the supervisor confirms it.
    receiptStatus: b.type === "Received" ? "Pending" : null,
    createdBy: req.user._id,
  });
  await material.populate("project", "name code");
  sendCreated(res, material);
});

// POST /materials/:id/confirm — the supervisor confirms a delivery or flags an issue.
export const confirmMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findById(req.params.id);
  if (!material) throw ApiError.notFound("Material entry not found");
  if (material.type !== "Received") {
    throw ApiError.badRequest("Only received deliveries can be confirmed");
  }
  const project = await Project.findById(material.project);
  if (!project) throw ApiError.notFound("Project not found");
  assertProjectScope(req.user, project);

  material.receiptStatus = req.body.status; // "Confirmed" | "Issue"
  material.confirmedBy = req.user._id;
  material.confirmedAt = new Date();
  material.receiptNote = req.body.note ?? null;
  await material.save();
  await material.populate([
    { path: "project", select: "name code" },
    { path: "confirmedBy", select: "name role" },
  ]);
  sendSuccess(res, material);
});

export const listMaterials = asyncHandler(async (req, res) => {
  const ands = [];
  const ids = await visibleProjectIds(req.user);
  if (ids !== null) ands.push({ project: { $in: ids } });
  if (req.query.project && mongoose.isValidObjectId(req.query.project)) {
    ands.push({ project: req.query.project });
  }
  if (req.query.type) ands.push({ type: req.query.type });
  if (req.query.receiptStatus) ands.push({ receiptStatus: req.query.receiptStatus });
  if (req.query.from || req.query.to) {
    const range = {};
    if (req.query.from) range.$gte = new Date(req.query.from);
    if (req.query.to) range.$lte = new Date(req.query.to);
    ands.push({ date: range });
  }
  const filter = ands.length ? { $and: ands } : {};
  const materials = await Material.find(filter)
    .populate("project", "name code")
    .populate("confirmedBy", "name role")
    .sort({ date: -1 });
  sendSuccess(res, materials);
});

// POST /materials/bulk — create multiple material entries sharing date/project/type/party.
export const createBulkMaterial = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!mongoose.isValidObjectId(b.project)) {
    throw ApiError.badRequest("Invalid project");
  }
  const project = await Project.findById(b.project);
  if (!project) throw ApiError.badRequest("Project not found");

  assertCanRecord(req.user.role, b.type);
  assertProjectScope(req.user, project);

  const created = [];
  for (const item of b.items) {
    const material = await Material.create({
      date: b.date,
      project: project._id,
      materialName: item.materialName,
      quantity: item.quantity,
      unit: item.unit,
      type: b.type,
      party: b.party ?? null,
      contractor: null,
      note: item.note ?? null,
      receiptStatus: b.type === "Received" ? "Pending" : null,
      createdBy: req.user._id,
    });
    created.push(material);
  }

  // Populate project on all created entries
  await Promise.all(created.map((m) => m.populate("project", "name code")));
  sendCreated(res, created);
});

// POST /materials/request — Supervisor requests material
export const requestMaterial = asyncHandler(async (req, res) => {
  const { date, project, materialName, quantity, unit, note } = req.body;
  if (!mongoose.isValidObjectId(project)) {
    throw ApiError.badRequest("Invalid project id");
  }
  const proj = await Project.findById(project);
  if (!proj) throw ApiError.badRequest("Project not found");

  const doc = await Material.create({
    date: date || new Date(),
    project: proj._id,
    materialName,
    quantity,
    unit,
    type: "Requested",
    status: "Requested",
    note: note ?? null,
    requestedBy: req.user._id,
    createdBy: req.user._id,
  });
  await doc.populate([
    { path: "project", select: "name code" },
    { path: "requestedBy", select: "name role" },
  ]);
  sendCreated(res, doc);
});

// PATCH /materials/:id/provide — Manager fulfills/provides requested material
export const provideMaterial = asyncHandler(async (req, res) => {
  const mat = await Material.findById(req.params.id);
  if (!mat) throw ApiError.notFound("Material request not found");

  mat.status = "Provided";
  mat.providedBy = req.user._id;
  mat.providedAt = new Date();
  await mat.save();
  await mat.populate([
    { path: "project", select: "name code" },
    { path: "requestedBy", select: "name role" },
    { path: "providedBy", select: "name role" },
  ]);
  sendSuccess(res, mat);
});

// PATCH /materials/:id/acknowledge — Supervisor confirms delivery on site
export const acknowledgeMaterial = asyncHandler(async (req, res) => {
  const mat = await Material.findById(req.params.id);
  if (!mat) throw ApiError.notFound("Material request not found");

  mat.status = "Acknowledged";
  mat.acknowledgedBy = req.user._id;
  mat.acknowledgedAt = new Date();
  await mat.save();
  await mat.populate([
    { path: "project", select: "name code" },
    { path: "requestedBy", select: "name role" },
    { path: "providedBy", select: "name role" },
    { path: "acknowledgedBy", select: "name role" },
  ]);
  sendSuccess(res, mat);
});
