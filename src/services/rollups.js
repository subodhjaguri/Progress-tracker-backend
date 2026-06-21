import mongoose from "mongoose";
import { WorkOrder } from "../models/WorkOrder.js";
import { Attendance } from "../models/Attendance.js";

const oid = (id) => new mongoose.Types.ObjectId(String(id));

/** Present/absent/half-day counts + attendance % for an attendance match filter. */
export async function attendanceCounts(match) {
  const rows = await Attendance.aggregate([
    { $match: { ...match, isDeleted: { $ne: true } } },
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
  return {
    present,
    absent,
    halfDay,
    total,
    percentage: total ? Math.round(((present + 0.5 * halfDay) / total) * 100) : 0,
  };
}

/**
 * Average work-order progress per project for a set of project ids.
 * Returns Map<projectIdString, { progress, workOrders }>. Aggregation bypasses the
 * soft-delete find hook, so isDeleted is filtered explicitly.
 */
export async function progressByProject(projectIds) {
  if (!projectIds.length) return new Map();
  const rows = await WorkOrder.aggregate([
    { $match: { projectId: { $in: projectIds.map(oid) }, isDeleted: { $ne: true } } },
    { $group: { _id: "$projectId", avg: { $avg: "$progress" }, total: { $sum: 1 } } },
  ]);
  const map = new Map();
  for (const r of rows) {
    map.set(r._id.toString(), {
      progress: Math.round(r.avg || 0),
      workOrders: r.total,
    });
  }
  return map;
}

/** Progress + work-order counts (overall and by status) for a single project. */
export async function projectSummary(projectId) {
  const rows = await WorkOrder.aggregate([
    { $match: { projectId: oid(projectId), isDeleted: { $ne: true } } },
    { $group: { _id: "$status", count: { $sum: 1 }, sum: { $sum: "$progress" } } },
  ]);
  const byStatus = {};
  let total = 0;
  let progressSum = 0;
  for (const r of rows) {
    byStatus[r._id] = r.count;
    total += r.count;
    progressSum += r.sum;
  }
  return {
    progress: total ? Math.round(progressSum / total) : 0,
    totalWorkOrders: total,
    byStatus,
  };
}
