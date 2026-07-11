// Central controlled-value sets. Roles are UPPERCASE codes (UI maps to labels).
// Domain enums keep the PRD display strings (the frontend derives styling from them).

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  MANAGER: "MANAGER",
  CONTRACTOR: "CONTRACTOR",
  SUPERVISOR: "SUPERVISOR",
};

export const USER_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

export const PROJECT_STATUS = ["Planning", "In Progress", "Blocked", "Completed"];
export const WORK_ORDER_STATUS = ["Not Started", "In Progress", "Blocked", "Completed"];
export const PRIORITY = ["Low", "Medium", "High", "Critical"];
export const ATTENDANCE_STATUS = ["Present", "Absent", "Half Day"];
export const SKILLS = [
  "Mason",
  "Welder",
  "Electrician",
  "Painter",
  "Carpenter",
  "Helper",
  "Plumber",
];
export const DOC_CATEGORY = [
  "Agreement",
  "Drawing",
  "Receipt",
  "Site Photo",
  "Material Document",
  "Other",
];
export const DOC_PARENT_TYPES = ["Project", "WorkOrder", "Contractor", "Labour"];
export const COMMENT_PARENT_TYPES = ["WorkOrder", "Project"];
export const MATERIAL_TYPE = ["Received", "Used", "Issued"];
export const MATERIAL_RECEIPT_STATUS = ["Pending", "Confirmed", "Issue"];
export const LABOUR_TASK_STATUS = ["Not Started", "In Progress", "Completed"];
