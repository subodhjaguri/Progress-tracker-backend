import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/response.js";
import { Project } from "../models/Project.js";
import { WorkOrder } from "../models/WorkOrder.js";
import { Material } from "../models/Material.js";
import { ProgressUpdate } from "../models/ProgressUpdate.js";
import { Document } from "../models/Document.js";
import { projectScopeFilter } from "../services/access.js";
import { attendanceCounts } from "../services/rollups.js";
import { dayRange } from "../utils/date.js";

// GET /projects/:id/daily-report?date=YYYY-MM-DD  (PRD §14)
export const dailyReport = asyncHandler(async (req, res) => {
  const scope = await projectScopeFilter(req.user);
  const filter = Object.keys(scope).length
    ? { $and: [scope, { _id: req.params.id }] }
    : { _id: req.params.id };
  const project = await Project.findOne(filter).populate("manager", "name");
  if (!project) throw ApiError.notFound("Project not found");

  const { start, end } = dayRange(req.query.date || new Date());
  const projectId = project._id;

  const workOrders = await WorkOrder.find({ projectId })
    .populate("contractor", "name")
    .sort({ createdAt: -1 });
  const byStatus = { "Not Started": 0, "In Progress": 0, Blocked: 0, Completed: 0 };
  for (const w of workOrders) byStatus[w.status] = (byStatus[w.status] || 0) + 1;
  const woIds = workOrders.map((w) => w._id);

  const [attendance, materialsIssued, photos, remarks] = await Promise.all([
    attendanceCounts({ project: projectId, date: { $gte: start, $lt: end } }),
    Material.find({ project: projectId, type: "Issued", date: { $gte: start, $lt: end } }),
    Document.find({
      category: "Site Photo",
      createdAt: { $gte: start, $lt: end },
      $or: [
        { parentType: "Project", parentId: projectId },
        { parentType: "WorkOrder", parentId: { $in: woIds } },
      ],
    }),
    ProgressUpdate.find({ projectId, date: { $gte: start, $lt: end } })
      .populate("author", "name role")
      .sort({ date: -1 }),
  ]);

  sendSuccess(res, {
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      siteName: project.siteName,
      siteLocation: project.siteLocation,
      manager: project.manager,
    },
    date: start,
    attendance,
    workOrders: { byStatus, total: workOrders.length, list: workOrders },
    materialsIssued,
    photos: { count: photos.length, list: photos },
    remarks,
  });
});
