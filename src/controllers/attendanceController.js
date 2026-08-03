import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/response.js";
import { Attendance } from "../models/Attendance.js";
import { Labour } from "../models/Labour.js";
import { WorkOrder } from "../models/WorkOrder.js";
import { Project } from "../models/Project.js";
import { ROLES } from "../constants/enums.js";
import { attendanceScopeFilter } from "../services/access.js";

const oid = (id) => new mongoose.Types.ObjectId(String(id));

/** Day-bucket a date by its UTC calendar date (matches the {labour,date} rule). */
function dayStart(d) {
  const dt = new Date(d);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

export const markAttendance = asyncHandler(async (req, res) => {
  const { date, project, workOrder, entries } = req.body;
  if (!mongoose.isValidObjectId(project)) {
    throw ApiError.badRequest("Invalid project id");
  }
  const proj = await Project.findById(project);
  if (!proj) throw ApiError.badRequest("Project not found");

  if (req.user.role !== ROLES.SUPER_ADMIN) {
    const isDirectSupervisor = proj.supervisor && proj.supervisor.equals(req.user._id);
    const hasWorkOrderInProj = await WorkOrder.exists({
      projectId: proj._id,
      supervisor: req.user._id,
    });
    if (!isDirectSupervisor && !hasWorkOrderInProj) {
      throw ApiError.forbidden("You can only mark attendance for projects assigned to you");
    }
  }

  let wo = null;
  if (workOrder) {
    if (!mongoose.isValidObjectId(workOrder)) {
      throw ApiError.badRequest("Invalid work order id");
    }
    wo = await WorkOrder.findById(workOrder);
    if (!wo) throw ApiError.badRequest("Work order not found");
    if (!wo.projectId.equals(proj._id)) {
      throw ApiError.badRequest("Work order does not belong to the project");
    }
  }

  // All labour must belong to this supervisor.
  const labourIds = entries.map((e) => e.labour);
  for (const id of labourIds) {
    if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest("Invalid labour id");
  }
  const owned = await Labour.find({
    _id: { $in: labourIds },
    supervisor: req.user._id,
  }).select("_id");
  const ownedSet = new Set(owned.map((l) => l._id.toString()));
  for (const id of labourIds) {
    if (!ownedSet.has(String(id))) {
      throw ApiError.badRequest("One or more labour do not belong to you");
    }
  }

  const day = dayStart(date);

  // Once marked, attendance cannot be updated. Check for pre-existing records.
  const existing = await Attendance.find({
    labour: { $in: labourIds },
    date: day,
    isDeleted: { $ne: true },
  }).select("labour");

  if (existing.length > 0) {
    throw ApiError.badRequest(
      "Attendance has already been marked for this date and cannot be updated."
    );
  }

  const records = [];
  for (const e of entries) {
    const doc = await Attendance.create({
      labour: e.labour,
      date: day,
      status: e.status,
      remarks: e.remarks ?? null,
      supervisor: req.user._id,
      contractor: wo?.contractor ?? null,
      project: proj._id,
      workOrder: wo ? wo._id : null,
      createdBy: req.user._id,
    });
    records.push(doc);
  }
  sendSuccess(res, { count: records.length, records });
});

export const listAttendance = asyncHandler(async (req, res) => {
  const ands = [];
  const scope = await attendanceScopeFilter(req.user);
  if (Object.keys(scope).length) ands.push(scope);
  if (req.query.date) ands.push({ date: dayStart(req.query.date) });
  if (req.query.project && mongoose.isValidObjectId(req.query.project)) {
    ands.push({ project: req.query.project });
  }
  if (req.query.contractor && mongoose.isValidObjectId(req.query.contractor)) {
    ands.push({ contractor: req.query.contractor });
  }
  if (req.query.labour && mongoose.isValidObjectId(req.query.labour)) {
    ands.push({ labour: req.query.labour });
  }
  const filter = ands.length ? { $and: ands } : {};
  const records = await Attendance.find(filter)
    .populate("labour", "name skill")
    .populate("project", "name code")
    .populate("workOrder", "title code")
    .sort({ date: -1 });
  sendSuccess(res, records);
});

export const attendanceSummary = asyncHandler(async (req, res) => {
  const { scope, id, month, date } = req.query;
  if (!["labour", "contractor", "project"].includes(scope)) {
    throw ApiError.badRequest("scope must be labour, contractor, or project");
  }
  if (!id || !mongoose.isValidObjectId(id)) {
    throw ApiError.badRequest("A valid id is required");
  }

  const and = [{ [scope]: oid(id) }];

  // Enforce access by intersecting with what the user is allowed to see.
  const accessScope = await attendanceScopeFilter(req.user);
  if (Object.keys(accessScope).length) and.push(accessScope);

  if (date) {
    and.push({ date: dayStart(date) });
  } else if (month) {
    const [y, m] = String(month).split("-").map(Number);
    if (!y || !m) throw ApiError.badRequest("month must be YYYY-MM");
    and.push({
      date: { $gte: new Date(Date.UTC(y, m - 1, 1)), $lt: new Date(Date.UTC(y, m, 1)) },
    });
  }

  const match = { isDeleted: { $ne: true }, $and: and };
  const rows = await Attendance.aggregate([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  let present = 0;
  let absent = 0;
  let halfDay = 0;
  for (const r of rows) {
    if (r._id === "Present") present = r.count;
    else if (r._id === "Absent") absent = r.count;
    else if (r._id === "Half Day") halfDay = r.count;
  }
  const total = present + absent + halfDay;
  const percentage = total
    ? Math.round(((present + 0.5 * halfDay) / total) * 100)
    : 0;
  sendSuccess(res, { scope, id, present, absent, halfDay, total, percentage });
});
