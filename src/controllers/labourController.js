import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { Labour } from "../models/Labour.js";
import { labourScopeFilter } from "../services/access.js";

const CONTRACTOR_VIEW = "name mobile role";

export const createLabour = asyncHandler(async (req, res) => {
  const b = req.body;
  const labour = await Labour.create({
    name: b.name,
    mobile: b.mobile ?? null,
    aadhaarNumber: b.aadhaarNumber ?? null,
    skill: b.skill,
    contractor: req.user._id, // contractors create their own labour
    createdBy: req.user._id,
  });
  sendCreated(res, labour);
});

export const listLabour = asyncHandler(async (req, res) => {
  const ands = [];
  const scope = await labourScopeFilter(req.user);
  if (Object.keys(scope).length) ands.push(scope);
  if (req.query.skill) ands.push({ skill: req.query.skill });
  if (req.query.contractor && mongoose.isValidObjectId(req.query.contractor)) {
    ands.push({ contractor: req.query.contractor });
  }
  const filter = ands.length ? { $and: ands } : {};
  const labour = await Labour.find(filter)
    .populate("contractor", CONTRACTOR_VIEW)
    .sort({ createdAt: -1 });
  sendSuccess(res, labour);
});

export const getLabour = asyncHandler(async (req, res) => {
  const scope = await labourScopeFilter(req.user);
  const filter = Object.keys(scope).length
    ? { $and: [scope, { _id: req.params.id }] }
    : { _id: req.params.id };
  const labour = await Labour.findOne(filter).populate("contractor", CONTRACTOR_VIEW);
  if (!labour) throw ApiError.notFound("Labour not found");
  sendSuccess(res, labour);
});

// Edits/removal restricted to the owning contractor.
async function loadOwnLabour(req) {
  const labour = await Labour.findOne({
    _id: req.params.id,
    contractor: req.user._id,
  });
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
