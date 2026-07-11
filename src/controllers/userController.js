import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { User } from "../models/User.js";
import { ROLES } from "../constants/enums.js";
import { generateTempPassword } from "../utils/password.js";
import { userIdsVisibleToManager } from "../services/access.js";

async function createUserAccount({ role, body, creator }) {
  const generated = !body.password;
  const tempPassword = body.password || generateTempPassword();
  const passwordHash = await User.hashPassword(tempPassword);

  const doc = {
    name: body.name,
    mobile: body.mobile,
    email: body.email || null,
    passwordHash,
    role,
    createdBy: creator._id,
    mustChangePassword: generated,
  };
  if (role === ROLES.CONTRACTOR) {
    doc.aadhaarNumber = body.aadhaarNumber || null;
    doc.address = body.address || null;
  }

  const user = await User.create(doc);
  // temporaryPassword is returned ONCE (only when we generated it).
  return { user, temporaryPassword: generated ? tempPassword : undefined };
}

function ensureNotSuperAdmin(target) {
  if (target.role === ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden("Cannot modify a Super Admin account");
  }
}

// Load a contractor/supervisor by id, enforcing the manager "visible to me" scope.
async function loadUserScoped(req, role, noun) {
  const user = await User.findOne({ _id: req.params.id, role });
  if (!user) throw ApiError.notFound(`${noun} not found`);
  if (req.user.role === ROLES.MANAGER) {
    const ids = await userIdsVisibleToManager(req.user._id, role);
    if (!ids.has(user._id.toString())) throw ApiError.forbidden();
  }
  return user;
}

// List users of a role, scoped to those a manager may see.
async function listUsersByRole(req, role) {
  const filter = { role };
  if (req.user.role === ROLES.MANAGER) {
    const ids = await userIdsVisibleToManager(req.user._id, role);
    filter._id = { $in: [...ids] };
  }
  return User.find(filter).sort({ createdAt: -1 });
}

// ---- Managers (Super Admin only) ----

export const createManager = asyncHandler(async (req, res) => {
  const result = await createUserAccount({
    role: ROLES.MANAGER,
    body: req.body,
    creator: req.user,
  });
  sendCreated(res, result);
});

export const listManagers = asyncHandler(async (req, res) => {
  const managers = await User.find({ role: ROLES.MANAGER }).sort({
    createdAt: -1,
  });
  sendSuccess(res, managers);
});

// ---- Contractors (Super Admin + Manager, scoped) ----

export const createContractor = asyncHandler(async (req, res) => {
  const result = await createUserAccount({
    role: ROLES.CONTRACTOR,
    body: req.body,
    creator: req.user,
  });
  sendCreated(res, result);
});

export const listContractors = asyncHandler(async (req, res) => {
  sendSuccess(res, await listUsersByRole(req, ROLES.CONTRACTOR));
});

export const getContractor = asyncHandler(async (req, res) => {
  const contractor = await loadUserScoped(req, ROLES.CONTRACTOR, "Contractor");
  sendSuccess(res, contractor);
});

export const updateContractor = asyncHandler(async (req, res) => {
  const contractor = await loadUserScoped(req, ROLES.CONTRACTOR, "Contractor");
  for (const field of ["name", "mobile", "email", "aadhaarNumber", "address"]) {
    if (field in req.body) contractor[field] = req.body[field];
  }
  await contractor.save();
  sendSuccess(res, contractor);
});

// ---- Supervisors (Super Admin + Manager, scoped) ----

export const createSupervisor = asyncHandler(async (req, res) => {
  const result = await createUserAccount({
    role: ROLES.SUPERVISOR,
    body: req.body,
    creator: req.user,
  });
  sendCreated(res, result);
});

export const listSupervisors = asyncHandler(async (req, res) => {
  sendSuccess(res, await listUsersByRole(req, ROLES.SUPERVISOR));
});

export const getSupervisor = asyncHandler(async (req, res) => {
  const supervisor = await loadUserScoped(req, ROLES.SUPERVISOR, "Supervisor");
  sendSuccess(res, supervisor);
});

export const updateSupervisor = asyncHandler(async (req, res) => {
  const supervisor = await loadUserScoped(req, ROLES.SUPERVISOR, "Supervisor");
  for (const field of ["name", "mobile", "email"]) {
    if (field in req.body) supervisor[field] = req.body[field];
  }
  await supervisor.save();
  sendSuccess(res, supervisor);
});

// ---- Account admin (reset password / status), scoped ----

export const resetPassword = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) throw ApiError.notFound("User not found");
  ensureNotSuperAdmin(target);
  if (req.user.role === ROLES.MANAGER) {
    if (![ROLES.CONTRACTOR, ROLES.SUPERVISOR].includes(target.role)) {
      throw ApiError.forbidden();
    }
    const ids = await userIdsVisibleToManager(req.user._id, target.role);
    if (!ids.has(target._id.toString())) throw ApiError.forbidden();
  }

  const generated = !req.body.password;
  const tempPassword = req.body.password || generateTempPassword();
  target.passwordHash = await User.hashPassword(tempPassword);
  target.mustChangePassword = generated;
  await target.save();

  sendSuccess(res, {
    message: "Password reset",
    temporaryPassword: generated ? tempPassword : undefined,
  });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) throw ApiError.notFound("User not found");
  ensureNotSuperAdmin(target);
  if (target._id.equals(req.user._id)) {
    throw ApiError.badRequest("You cannot change your own status");
  }
  if (req.user.role === ROLES.MANAGER) {
    if (![ROLES.CONTRACTOR, ROLES.SUPERVISOR].includes(target.role)) {
      throw ApiError.forbidden();
    }
    const ids = await userIdsVisibleToManager(req.user._id, target.role);
    if (!ids.has(target._id.toString())) throw ApiError.forbidden();
  }
  target.status = req.body.status;
  await target.save();
  sendSuccess(res, target);
});
