import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { Labour } from "../models/Labour.js";
import { ROLES } from "../constants/enums.js";
import { labourScopeFilter } from "../services/access.js";

const SUPERVISOR_VIEW = "name mobile role";

export const createLabour = asyncHandler(async (req, res) => {
  const b = req.body;
  const labour = await Labour.create({
    name: b.name,
    mobile: b.mobile ?? null,
    aadhaarNumber: b.aadhaarNumber ?? null,
    skill: b.skill,
    supervisor: req.user._id, // supervisors create and manage their own labour
    contractor: b.contractor ?? null,
    createdBy: req.user._id,
  });
  sendCreated(res, labour);
});

export const listLabour = asyncHandler(async (req, res) => {
  const ands = [];
  const scope = await labourScopeFilter(req.user);
  if (Object.keys(scope).length) ands.push(scope);
  if (req.query.skill) ands.push({ skill: req.query.skill });
  if (req.query.supervisor && mongoose.isValidObjectId(req.query.supervisor)) {
    ands.push({ supervisor: req.query.supervisor });
  }
  if (req.query.contractor && mongoose.isValidObjectId(req.query.contractor)) {
    ands.push({ contractor: req.query.contractor });
  }
  const filter = ands.length ? { $and: ands } : {};
  const labour = await Labour.find(filter)
    .populate("supervisor", SUPERVISOR_VIEW)
    .populate("contractor", SUPERVISOR_VIEW)
    .sort({ createdAt: -1 });
  sendSuccess(res, labour);
});

export const getLabour = asyncHandler(async (req, res) => {
  const scope = await labourScopeFilter(req.user);
  const filter = Object.keys(scope).length
    ? { $and: [scope, { _id: req.params.id }] }
    : { _id: req.params.id };
  const labour = await Labour.findOne(filter)
    .populate("supervisor", SUPERVISOR_VIEW)
    .populate("contractor", SUPERVISOR_VIEW);
  if (!labour) throw ApiError.notFound("Labour not found");
  sendSuccess(res, labour);
});

// Edits/removal restricted to the managing supervisor (or Super Admin).
async function loadOwnLabour(req) {
  const filter = { _id: req.params.id };
  if (req.user.role === ROLES.SUPERVISOR) {
    filter.supervisor = req.user._id;
  }
  const labour = await Labour.findOne(filter);
  if (!labour) throw ApiError.notFound("Labour not found");
  return labour;
}

export const updateLabour = asyncHandler(async (req, res) => {
  const labour = await loadOwnLabour(req);
  for (const f of ["name", "mobile", "aadhaarNumber", "skill"]) {
    if (f in req.body) labour[f] = req.body[f];
  }
  await labour.save();
  sendSuccess(res, labour);
});

export const deleteLabour = asyncHandler(async (req, res) => {
  const labour = await loadOwnLabour(req);
  labour.isDeleted = true;
  labour.deletedAt = new Date();
  await labour.save();
  sendSuccess(res, { message: "Labour removed" });
});
