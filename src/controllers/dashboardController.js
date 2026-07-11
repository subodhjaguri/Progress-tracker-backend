import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { Project } from "../models/Project.js";
import { WorkOrder } from "../models/WorkOrder.js";
import { User } from "../models/User.js";
import { Labour } from "../models/Labour.js";
import { Material } from "../models/Material.js";
import { ProgressUpdate } from "../models/ProgressUpdate.js";
import { Comment } from "../models/Comment.js";
import { ROLES } from "../constants/enums.js";
import { managerProjectIds, supervisorProjectIds } from "../services/access.js";
import { progressByProject, attendanceCounts } from "../services/rollups.js";
import { dayRange, monthRange } from "../utils/date.js";

// countDocuments/aggregate bypass the soft-delete find hook, so filter explicitly.
const ND = { isDeleted: { $ne: true } };

async function superAdminDashboard() {
  const { start, end } = dayRange(new Date());
  const [
    totalProjects,
    activeProjects,
    completedProjects,
    totalManagers,
    totalContractors,
    totalLabourers,
  ] = await Promise.all([
    Project.countDocuments(ND),
    Project.countDocuments({ ...ND, status: "In Progress" }),
    Project.countDocuments({ ...ND, status: "Completed" }),
    User.countDocuments({ ...ND, role: ROLES.MANAGER }),
    User.countDocuments({ ...ND, role: ROLES.CONTRACTOR }),
    Labour.countDocuments(ND),
  ]);
  const [blockedWorkOrders, recentUpdates, recentMaterials, attendanceToday] =
    await Promise.all([
      WorkOrder.find({ status: "Blocked" })
        .populate("projectId", "name code")
        .populate("contractor", "name")
        .sort({ updatedAt: -1 })
        .limit(8),
      ProgressUpdate.find({})
        .populate("author", "name role")
        .populate("workOrderId", "title code")
        .sort({ date: -1 })
        .limit(8),
      Material.find({}).populate("project", "name code").sort({ date: -1 }).limit(8),
      attendanceCounts({ date: { $gte: start, $lt: end } }),
    ]);
  return {
    role: ROLES.SUPER_ADMIN,
    cards: {
      totalProjects,
      activeProjects,
      completedProjects,
      totalManagers,
      totalContractors,
      totalLabourers,
    },
    sections: { attendanceToday, blockedWorkOrders, recentUpdates, recentMaterials },
  };
}

async function managerDashboard(user) {
  const { start, end } = dayRange(new Date());
  const projectIds = await managerProjectIds(user._id);
  const woScope = { projectId: { $in: projectIds } };
  const [myProjects, activeWorkOrders, completedWorkOrders, blockedWorkOrders] =
    await Promise.all([
      Project.countDocuments({ ...ND, manager: user._id }),
      WorkOrder.countDocuments({ ...ND, ...woScope, status: "In Progress" }),
      WorkOrder.countDocuments({ ...ND, ...woScope, status: "Completed" }),
      WorkOrder.countDocuments({ ...ND, ...woScope, status: "Blocked" }),
    ]);
  const projects = await Project.find({ manager: user._id })
    .sort({ createdAt: -1 })
    .limit(6);
  const progMap = await progressByProject(projects.map((p) => p._id));
  const projectProgress = projects.map((p) => ({
    ...p.toJSON(),
    progress: progMap.get(p._id.toString())?.progress ?? 0,
  }));
  const [recentUpdates, recentMaterials, attendanceToday] = await Promise.all([
    ProgressUpdate.find({ projectId: { $in: projectIds } })
      .populate("author", "name role")
      .populate("workOrderId", "title code")
      .sort({ date: -1 })
      .limit(8),
    Material.find({ project: { $in: projectIds } })
      .populate("project", "name code")
      .sort({ date: -1 })
      .limit(8),
    attendanceCounts({ project: { $in: projectIds }, date: { $gte: start, $lt: end } }),
  ]);
  return {
    role: ROLES.MANAGER,
    cards: { myProjects, activeWorkOrders, completedWorkOrders, blockedWorkOrders },
    sections: { projectProgress, attendanceToday, recentUpdates, recentMaterials },
  };
}

async function contractorDashboard(user) {
  const { start, end } = dayRange(new Date());
  const [assignedWorkOrders, completedWorkOrders, pendingWorkOrders, labourCount] =
    await Promise.all([
      WorkOrder.countDocuments({ ...ND, contractor: user._id }),
      WorkOrder.countDocuments({ ...ND, contractor: user._id, status: "Completed" }),
      WorkOrder.countDocuments({
        ...ND,
        contractor: user._id,
        status: { $ne: "Completed" },
      }),
      Labour.countDocuments({ ...ND, contractor: user._id }),
    ]);
  const myWOs = await WorkOrder.find({ contractor: user._id }).select("_id");
  const woIds = myWOs.map((w) => w._id);
  const [todaysUpdates, recentComments, upcomingDueDates, todaysAttendance] =
    await Promise.all([
      ProgressUpdate.find({ author: user._id, date: { $gte: start, $lt: end } })
        .populate("workOrderId", "title code")
        .sort({ date: -1 })
        .limit(8),
      Comment.find({ parentType: "WorkOrder", parentId: { $in: woIds } })
        .populate("author", "name role")
        .sort({ createdAt: -1 })
        .limit(8),
      WorkOrder.find({
        contractor: user._id,
        status: { $ne: "Completed" },
        dueDate: { $gte: start },
      })
        .populate("projectId", "name code")
        .sort({ dueDate: 1 })
        .limit(8),
      attendanceCounts({ contractor: user._id, date: { $gte: start, $lt: end } }),
    ]);
  return {
    role: ROLES.CONTRACTOR,
    cards: { assignedWorkOrders, completedWorkOrders, pendingWorkOrders, labourCount },
    sections: { todaysAttendance, todaysUpdates, recentComments, upcomingDueDates },
  };
}

async function supervisorDashboard(user) {
  const { start, end } = dayRange(new Date());
  const month = monthRange(new Date());
  const projectIds = await supervisorProjectIds(user._id);
  const matScope = { project: { $in: projectIds } };
  const pendingFilter = { ...matScope, type: "Received", receiptStatus: "Pending" };
  const usageFilter = { ...matScope, type: "Used", date: { $gte: start, $lt: end } };
  // No data dependency between the counts and the lists, so run them all concurrently.
  const [
    pendingConfirmations,
    deliveriesThisMonth,
    usageLoggedToday,
    pending,
    recentActivity,
    todaysUsage,
  ] = await Promise.all([
    Material.countDocuments({ ...ND, ...pendingFilter }),
    Material.countDocuments({
      ...ND,
      ...matScope,
      type: "Received",
      date: { $gte: month.start, $lt: month.end },
    }),
    Material.countDocuments({ ...ND, ...usageFilter }),
    Material.find(pendingFilter).populate("project", "name code").sort({ date: -1 }).limit(8),
    Material.find(matScope).populate("project", "name code").sort({ date: -1 }).limit(8),
    Material.find(usageFilter).populate("project", "name code").sort({ date: -1 }).limit(8),
  ]);
  return {
    role: ROLES.SUPERVISOR,
    cards: { mySites: projectIds.length, pendingConfirmations, deliveriesThisMonth, usageLoggedToday },
    sections: { pendingConfirmations: pending, recentActivity, todaysUsage },
  };
}

export const getDashboard = asyncHandler(async (req, res) => {
  let data;
  if (req.user.role === ROLES.SUPER_ADMIN) data = await superAdminDashboard();
  else if (req.user.role === ROLES.MANAGER) data = await managerDashboard(req.user);
  else if (req.user.role === ROLES.SUPERVISOR)
    data = await supervisorDashboard(req.user);
  else data = await contractorDashboard(req.user);
  sendSuccess(res, data);
});
