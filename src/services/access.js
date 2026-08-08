import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Project } from "../models/Project.js";
import { WorkOrder } from "../models/WorkOrder.js";
import { ROLES } from "../constants/enums.js";
import { ApiError } from "../utils/ApiError.js";

const oid = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * Guard for writes against a single project: throw 403 unless this user owns it.
 * Manager = they manage it, Supervisor = they are the site custodian, Engineer =
 * they are assigned to it, Super Admin = anything.
 *
 * Lives here (not in a controller) so every controller that writes project-bound
 * data uses the same rule — the read side has always been covered by
 * `visibleProjectIds`, and the write side drifted apart without it.
 */
export function assertProjectScope(user, project) {
  if (user.role === ROLES.SUPER_ADMIN) return;
  if (user.role === ROLES.MANAGER) {
    if (!project.manager?.equals(user._id)) {
      throw ApiError.forbidden("You can only act on projects you manage");
    }
    return;
  }
  if (user.role === ROLES.SUPERVISOR) {
    if (!project.supervisor?.equals(user._id)) {
      throw ApiError.forbidden("You can only act on sites you supervise");
    }
    return;
  }
  if (user.role === ROLES.ENGINEER) {
    if (!(project.engineers || []).some((id) => id.equals(user._id))) {
      throw ApiError.forbidden("You can only act on projects you are assigned to");
    }
    return;
  }
  throw ApiError.forbidden("You do not have permission to act on this project");
}

/**
 * Same guard when you only hold the project id — e.g. authorizing a write against
 * a ledger entry, payment or note that was just loaded. Returns the project.
 */
export async function assertProjectScopeById(user, projectId) {
  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound("Project not found");
  assertProjectScope(user, project);
  return project;
}

/** Project _ids managed by a given manager. */
export async function managerProjectIds(managerId) {
  const projects = await Project.find({ manager: managerId }).select("_id");
  return projects.map((p) => p._id);
}

/** Project _ids where the given user is the assigned supervisor or work order supervisor. */
export async function supervisorProjectIds(supervisorId) {
  const [projects, wos] = await Promise.all([
    Project.find({ supervisor: supervisorId }).select("_id"),
    WorkOrder.find({ supervisor: supervisorId }).select("projectId"),
  ]);
  const ids = new Set(projects.map((p) => p._id.toString()));
  for (const wo of wos) {
    if (wo.projectId) ids.add(wo.projectId.toString());
  }
  return [...ids].map(oid);
}

/**
 * Supervisor ids (as strings) a manager may view/edit (mirrors §7.2 for contractors):
 *   - supervisors the manager created, OR
 *   - supervisors assigned to a project the manager manages.
 */
export async function supervisorIdsVisibleToManager(managerId) {
  const [created, projects] = await Promise.all([
    User.find({ role: ROLES.SUPERVISOR, createdBy: managerId }).select("_id"),
    Project.find({ manager: managerId }).select("supervisor"),
  ]);
  const ids = new Set(created.map((u) => u._id.toString()));
  for (const p of projects) if (p.supervisor) ids.add(p.supervisor.toString());
  return ids;
}

/**
 * Engineer ids (as strings) a manager may view/edit:
 *   - engineers the manager created, OR
 *   - engineers assigned to a project the manager manages.
 */
export async function engineerIdsVisibleToManager(managerId) {
  const [created, projects] = await Promise.all([
    User.find({ role: ROLES.ENGINEER, createdBy: managerId }).select("_id"),
    Project.find({ manager: managerId }).select("engineers"),
  ]);
  const ids = new Set(created.map((u) => u._id.toString()));
  for (const p of projects) {
    if (Array.isArray(p.engineers)) {
      for (const eng of p.engineers) ids.add(eng.toString());
    }
  }
  return ids;
}

/** Manager-visible user ids for a given role (contractor / supervisor / engineer). */
export async function userIdsVisibleToManager(managerId, role) {
  if (role === ROLES.CONTRACTOR) return contractorIdsVisibleToManager(managerId);
  if (role === ROLES.SUPERVISOR) return supervisorIdsVisibleToManager(managerId);
  if (role === ROLES.ENGINEER) return engineerIdsVisibleToManager(managerId);
  return new Set();
}

/**
 * Contractor ids (as strings) a manager may view/edit (PRD §7.2):
 *   - contractors the manager created, OR
 *   - contractors assigned to a work order in a project the manager manages.
 */
export async function contractorIdsVisibleToManager(managerId) {
  const created = await User.find({
    role: ROLES.CONTRACTOR,
    createdBy: managerId,
  }).select("_id");
  const ids = new Set(created.map((u) => u._id.toString()));

  const projectIds = await managerProjectIds(managerId);
  if (projectIds.length) {
    const wos = await WorkOrder.find({
      projectId: { $in: projectIds },
    }).select("contractor");
    for (const wo of wos) if (wo.contractor) ids.add(wo.contractor.toString());
  }
  return ids;
}

/** Mongo filter restricting Projects to those the user may see. */
export async function projectScopeFilter(user) {
  if (user.role === ROLES.SUPER_ADMIN) return {};
  if (user.role === ROLES.MANAGER) return { manager: user._id };
  if (user.role === ROLES.SUPERVISOR) return { supervisor: user._id };
  if (user.role === ROLES.ENGINEER) return { engineers: user._id };
  // Contractor: projects where they have at least one work order.
  const wos = await WorkOrder.find({ contractor: user._id }).select("projectId");
  const ids = [...new Set(wos.map((w) => w.projectId.toString()))].map(oid);
  return { _id: { $in: ids } };
}

/** Mongo filter restricting Work Orders to those the user may see. */
export async function workOrderScopeFilter(user) {
  if (user.role === ROLES.SUPER_ADMIN) return {};
  if (user.role === ROLES.MANAGER) {
    const ids = await managerProjectIds(user._id);
    return { projectId: { $in: ids } };
  }
  if (user.role === ROLES.SUPERVISOR) {
    return { supervisor: user._id };
  }
  return { contractor: user._id };
}

/** Mongo filter restricting Labour to those the user may see. */
export async function labourScopeFilter(user) {
  if (user.role === ROLES.SUPER_ADMIN) return {};
  if (user.role === ROLES.MANAGER) {
    const ids = await contractorIdsVisibleToManager(user._id);
    return { contractor: { $in: [...ids].map(oid) } };
  }
  if (user.role === ROLES.SUPERVISOR) {
    return { supervisor: user._id };
  }
  return { contractor: user._id };
}

/** Mongo filter restricting Attendance to records the user may see. */
export async function attendanceScopeFilter(user) {
  if (user.role === ROLES.SUPER_ADMIN) return {};
  if (user.role === ROLES.MANAGER) {
    const ids = await managerProjectIds(user._id);
    return { project: { $in: ids } };
  }
  if (user.role === ROLES.SUPERVISOR) {
    return { supervisor: user._id };
  }
  return { contractor: user._id };
}

/**
 * Project _ids a user may see, or `null` for "all" (Super Admin).
 *  - Manager: projects they manage.
 *  - Contractor: projects where they have at least one work order.
 */
export async function visibleProjectIds(user) {
  if (user.role === ROLES.SUPER_ADMIN) return null;
  if (user.role === ROLES.MANAGER) return managerProjectIds(user._id);
  if (user.role === ROLES.SUPERVISOR) return supervisorProjectIds(user._id);
  if (user.role === ROLES.ENGINEER) {
    const projects = await Project.find({ engineers: user._id }).select("_id");
    return projects.map((p) => p._id);
  }
  const wos = await WorkOrder.find({ contractor: user._id }).select("projectId");
  return [...new Set(wos.map((w) => w.projectId.toString()))].map(oid);
}
