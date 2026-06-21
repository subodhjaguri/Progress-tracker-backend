import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { Material } from "../models/Material.js";
import { Project } from "../models/Project.js";
import { ROLES } from "../constants/enums.js";
import { visibleProjectIds } from "../services/access.js";

export const createMaterial = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!mongoose.isValidObjectId(b.project)) {
    throw ApiError.badRequest("Invalid project");
  }
  const project = await Project.findById(b.project);
  if (!project) throw ApiError.badRequest("Project not found");
  if (req.user.role === ROLES.MANAGER && !project.manager.equals(req.user._id)) {
    throw ApiError.forbidden("You can only record materials for your own projects");
  }
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
    createdBy: req.user._id,
  });
  await material.populate("project", "name code");
  sendCreated(res, material);
});

export const listMaterials = asyncHandler(async (req, res) => {
  const ands = [];
  const ids = await visibleProjectIds(req.user);
  if (ids !== null) ands.push({ project: { $in: ids } });
  if (req.query.project && mongoose.isValidObjectId(req.query.project)) {
    ands.push({ project: req.query.project });
  }
  if (req.query.type) ands.push({ type: req.query.type });
  if (req.query.from || req.query.to) {
    const range = {};
    if (req.query.from) range.$gte = new Date(req.query.from);
    if (req.query.to) range.$lte = new Date(req.query.to);
    ands.push({ date: range });
  }
  const filter = ands.length ? { $and: ands } : {};
  const materials = await Material.find(filter)
    .populate("project", "name code")
    .sort({ date: -1 });
  sendSuccess(res, materials);
});
