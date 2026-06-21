import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/response.js";
import { Project } from "../models/Project.js";
import { WorkOrder } from "../models/WorkOrder.js";
import { User } from "../models/User.js";
import { Labour } from "../models/Labour.js";
import { ROLES } from "../constants/enums.js";
import {
  projectScopeFilter,
  workOrderScopeFilter,
  labourScopeFilter,
  contractorIdsVisibleToManager,
} from "../services/access.js";

const oid = (id) => new mongoose.Types.ObjectId(String(id));
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const withScope = (scope, clause) =>
  Object.keys(scope).length ? { $and: [scope, clause] } : clause;

// GET /search?q=  — cross-entity, scoped to what the user may see.
export const search = asyncHandler(async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) throw ApiError.badRequest("q is required");
  const rx = new RegExp(escapeRegex(q), "i");

  const [pScope, wScope, lScope] = await Promise.all([
    projectScopeFilter(req.user),
    workOrderScopeFilter(req.user),
    labourScopeFilter(req.user),
  ]);

  // Contractor base filter
  let contractorBase;
  if (req.user.role === ROLES.SUPER_ADMIN) {
    contractorBase = { role: ROLES.CONTRACTOR };
  } else if (req.user.role === ROLES.MANAGER) {
    const ids = await contractorIdsVisibleToManager(req.user._id);
    contractorBase = { role: ROLES.CONTRACTOR, _id: { $in: [...ids].map(oid) } };
  } else {
    contractorBase = { _id: req.user._id };
  }

  const [projects, workOrders, contractors, labour] = await Promise.all([
    Project.find(withScope(pScope, { $or: [{ name: rx }, { code: rx }] }))
      .select("name code status")
      .limit(10),
    WorkOrder.find(withScope(wScope, { $or: [{ title: rx }, { code: rx }] }))
      .select("title code status")
      .populate("projectId", "name code")
      .limit(10),
    User.find({ $and: [contractorBase, { $or: [{ name: rx }, { mobile: rx }] }] })
      .select("name mobile role")
      .limit(10),
    Labour.find(withScope(lScope, { name: rx })).select("name skill").limit(10),
  ]);

  sendSuccess(res, { projects, workOrders, contractors, labour });
});
