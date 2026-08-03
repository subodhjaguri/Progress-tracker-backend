import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { Payment } from "../models/Payment.js";
import { Project } from "../models/Project.js";
import { ROLES } from "../constants/enums.js";
import { visibleProjectIds } from "../services/access.js";

export const createPayment = asyncHandler(async (req, res) => {
  const { project, type, amount, date, contractor, labourCount, proofNotes, attachment } = req.body;
  if (!mongoose.isValidObjectId(project)) {
    throw ApiError.badRequest("Invalid project id");
  }
  const proj = await Project.findById(project);
  if (!proj) throw ApiError.badRequest("Project not found");

  // Role permissions:
  // - Supervisor can only create "Labour" type payment requests.
  // - Manager / Super Admin can create "Contractor", "Miscellaneous", or "Labour" payments.
  if (req.user.role === ROLES.SUPERVISOR && type !== "Labour") {
    throw ApiError.forbidden("Supervisors can only request Labour payments");
  }

  // Managers/Super Admin created Contractor or Miscellaneous payments default to "Paid" or "Approved",
  // whereas Labour payment requests default to "Requested".
  let defaultStatus = "Requested";
  if ((type === "Contractor" || type === "Miscellaneous") && req.user.role !== ROLES.SUPERVISOR) {
    defaultStatus = "Paid";
  }

  const doc = await Payment.create({
    project: proj._id,
    type,
    amount,
    date: date || new Date(),
    status: defaultStatus,
    requestedBy: req.user._id,
    approvedBy: defaultStatus === "Paid" ? req.user._id : null,
    contractor: contractor && mongoose.isValidObjectId(contractor) ? contractor : null,
    labourCount: labourCount || 0,
    proofNotes: proofNotes || null,
    attachment: attachment || null,
  });

  await doc.populate([
    { path: "project", select: "name code" },
    { path: "requestedBy", select: "name role" },
    { path: "contractor", select: "name mobile" },
  ]);

  sendCreated(res, doc);
});

export const listPayments = asyncHandler(async (req, res) => {
  const ands = [];
  const ids = await visibleProjectIds(req.user);
  if (ids !== null) ands.push({ project: { $in: ids } });

  if (req.query.project && mongoose.isValidObjectId(req.query.project)) {
    ands.push({ project: req.query.project });
  }
  if (req.query.type) {
    ands.push({ type: req.query.type });
  }
  if (req.query.status) {
    ands.push({ status: req.query.status });
  }
  if (req.query.from || req.query.to) {
    const range = {};
    if (req.query.from) range.$gte = new Date(req.query.from);
    if (req.query.to) range.$lte = new Date(req.query.to);
    ands.push({ date: range });
  }

  const filter = ands.length ? { $and: ands } : {};

  const payments = await Payment.find(filter)
    .populate("project", "name code")
    .populate("requestedBy", "name role")
    .populate("approvedBy", "name role")
    .populate("contractor", "name mobile")
    .sort({ date: -1 });

  sendSuccess(res, payments);
});

export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw ApiError.notFound("Payment record not found");

  if (req.user.role !== ROLES.SUPER_ADMIN && req.user.role !== ROLES.MANAGER) {
    throw ApiError.forbidden("Only managers and admins can update payment status");
  }

  payment.status = req.body.status;
  if (req.body.status === "Approved" || req.body.status === "Paid") {
    payment.approvedBy = req.user._id;
  }
  if (req.body.note) {
    payment.proofNotes = (payment.proofNotes ? `${payment.proofNotes} | Note: ` : "") + req.body.note;
  }

  await payment.save();
  await payment.populate([
    { path: "project", select: "name code" },
    { path: "requestedBy", select: "name role" },
    { path: "approvedBy", select: "name role" },
    { path: "contractor", select: "name mobile" },
  ]);

  sendSuccess(res, payment);
});
