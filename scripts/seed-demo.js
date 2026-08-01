// Demo/test data seed: accounts + a few projects, work orders and labour, with KNOWN
// passwords so you can log in as each role. Idempotent (skips records that already
// exist). Safe to re-run.  Run:  npm run seed:demo
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { Project } from "../src/models/Project.js";
import { WorkOrder } from "../src/models/WorkOrder.js";
import { Labour } from "../src/models/Labour.js";
import { Material } from "../src/models/Material.js";
import { ROLES, USER_STATUS } from "../src/constants/enums.js";
import { nextCode } from "../src/services/code.js";

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || "password123";

async function ensureUser({
  name,
  mobile,
  role,
  password,
  email = null,
  aadhaarNumber = null,
  address = null,
  createdBy = null,
}) {
  const existing = await User.findOne({ mobile });
  if (existing) return { user: existing, created: false };
  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name,
    mobile,
    role,
    email,
    passwordHash,
    status: USER_STATUS.ACTIVE,
    aadhaarNumber,
    address,
    createdBy,
  });
  return { user, created: true };
}

async function ensureProject({ name, manager, creator, ...fields }) {
  const existing = await Project.findOne({ name });
  if (existing) return existing;
  const code = await nextCode("project");
  return Project.create({ code, name, manager, createdBy: creator, ...fields });
}

async function ensureWorkOrder({ title, project, supervisor, contractor, creator, ...fields }) {
  const existing = await WorkOrder.findOne({ title, projectId: project });
  if (existing) return existing;
  const code = await nextCode("workOrder");
  return WorkOrder.create({
    code,
    projectId: project,
    title,
    supervisor,
    contractor,
    createdBy: creator,
    ...fields,
  });
}

async function ensureLabour({ name, contractor, skill, ...fields }) {
  const existing = await Labour.findOne({ name, contractor });
  if (existing) return existing;
  return Labour.create({ name, contractor, skill, createdBy: contractor, ...fields });
}

async function ensureMaterial({ project, materialName, type, date, ...fields }) {
  const existing = await Material.findOne({ project, materialName, type, date });
  if (existing) return existing;
  return Material.create({ project, materialName, type, date, ...fields });
}

async function run() {
  await connectDB();

  // 1) Super Admin — reuse the env one if present, else create a demo owner.
  const su = await ensureUser({
    name: process.env.SEED_SUPERADMIN_NAME || "Owner",
    mobile: process.env.SEED_SUPERADMIN_MOBILE || "9999999999",
    role: ROLES.SUPER_ADMIN,
    password: process.env.SEED_SUPERADMIN_PASSWORD || DEMO_PASSWORD,
    email: process.env.SEED_SUPERADMIN_EMAIL || "owner@example.com",
  });

  // 2) Managers
  const priya = await ensureUser({
    name: "Priya Sharma",
    mobile: "9810000001",
    role: ROLES.MANAGER,
    password: DEMO_PASSWORD,
    email: "priya@example.com",
    createdBy: su.user._id,
  });
  const arjun = await ensureUser({
    name: "Arjun Mehta",
    mobile: "9810000002",
    role: ROLES.MANAGER,
    password: DEMO_PASSWORD,
    email: "arjun@example.com",
    createdBy: su.user._id,
  });

  // 3) Contractors (Priya: Vikram + Salman, Arjun: Faizan)
  const contractorDefs = [
    { name: "Vikram Joshi", mobile: "9820000001", aadhaarNumber: "111122223333", address: "Apex Civil Works, Dehradun", createdBy: priya.user._id },
    { name: "Salman Ali", mobile: "9820000002", aadhaarNumber: "444455556666", address: "Flowline Services, Gurugram", createdBy: priya.user._id },
    { name: "Faizan Sheikh", mobile: "9820000003", aadhaarNumber: "777788889999", address: "Metro Fabricators, Pune", createdBy: arjun.user._id },
  ];
  const cons = {};
  for (const c of contractorDefs) {
    const r = await ensureUser({ ...c, role: ROLES.CONTRACTOR, password: DEMO_PASSWORD });
    cons[c.mobile] = r.user;
  }
  const vikram = cons["9820000001"];
  const salman = cons["9820000002"];
  const faizan = cons["9820000003"];

  // 3b) Supervisor (site material custodian) — created by Priya
  const rakesh = await ensureUser({
    name: "Rakesh Verma",
    mobile: "9830000001",
    role: ROLES.SUPERVISOR,
    password: DEMO_PASSWORD,
    email: "rakesh@example.com",
    createdBy: priya.user._id,
  });

  // 3c) Engineer (technical specialist) — created by Priya
  const rajesh = await ensureUser({
    name: "Rajesh Verma",
    mobile: "9840000001",
    role: ROLES.ENGINEER,
    password: DEMO_PASSWORD,
    email: "rajesh@example.com",
    createdBy: priya.user._id,
  });

  // 4) Projects
  const riverside = await ensureProject({
    name: "Riverside Hotel",
    manager: priya.user._id,
    creator: su.user._id,
    clientName: "Hillside Hospitality",
    clientMobile: "9876500001",
    siteName: "Riverside Hotel Site",
    siteLocation: "Dehradun, Uttarakhand",
    status: "In Progress",
    targetDate: new Date("2026-11-28"),
    engineers: [rajesh.user._id],
  });
  const greenfield = await ensureProject({
    name: "Greenfield School",
    manager: priya.user._id,
    creator: su.user._id,
    siteName: "Greenfield Education Campus",
    siteLocation: "Noida, Uttar Pradesh",
    status: "In Progress",
    targetDate: new Date("2026-07-15"),
    engineers: [rajesh.user._id],
  });
  const northstar = await ensureProject({
    name: "Northstar Warehouse",
    manager: arjun.user._id,
    creator: su.user._id,
    siteName: "Sector 7 Industrial Park",
    siteLocation: "Gurugram, Haryana",
    status: "Blocked",
    targetDate: new Date("2026-09-30"),
  });

  // 5) Work orders
  await ensureWorkOrder({ title: "Foundation & basement", project: riverside._id, supervisor: rakesh.user._id, contractor: vikram._id, creator: priya.user._id, priority: "Critical", status: "In Progress", progress: 60 });
  await ensureWorkOrder({ title: "Ground floor plumbing", project: riverside._id, supervisor: rakesh.user._id, contractor: salman._id, creator: priya.user._id, priority: "High", status: "Blocked", progress: 40 });
  await ensureWorkOrder({ title: "Classroom painting", project: greenfield._id, supervisor: rakesh.user._id, contractor: vikram._id, creator: priya.user._id, priority: "Medium", status: "In Progress", progress: 35 });
  await ensureWorkOrder({ title: "Structural steel erection", project: northstar._id, supervisor: rakesh.user._id, contractor: faizan._id, creator: arjun.user._id, priority: "Critical", status: "Blocked", progress: 30 });

  // 6) Labour
  await ensureLabour({ name: "Ramesh Kumar", supervisor: rakesh.user._id, contractor: vikram._id, skill: "Mason", mobile: "9811100001" });
  await ensureLabour({ name: "Sanjay Rawat", supervisor: rakesh.user._id, contractor: vikram._id, skill: "Helper" });
  await ensureLabour({ name: "Mohan Lal", supervisor: rakesh.user._id, contractor: vikram._id, skill: "Carpenter" });
  await ensureLabour({ name: "Imran Khan", supervisor: rakesh.user._id, contractor: salman._id, skill: "Welder" });
  await ensureLabour({ name: "Vijay Pal", supervisor: rakesh.user._id, contractor: faizan._id, skill: "Painter" });

  // 7) Assign the supervisor to Priya's sites (idempotent)
  for (const p of [riverside, greenfield]) {
    if (!p.supervisor) {
      p.supervisor = rakesh.user._id;
      await p.save();
    }
  }

  // 8) Material ledger for Riverside (custodian = Rakesh): a confirmed + a pending
  //    delivery, plus two days of usage the owner can see.
  await ensureMaterial({ project: riverside._id, materialName: "Cement", type: "Received", date: new Date("2026-07-08"), quantity: 100, unit: "bags", party: "UltraTech Supplier", receiptStatus: "Confirmed", confirmedBy: rakesh.user._id, confirmedAt: new Date("2026-07-08"), createdBy: priya.user._id });
  await ensureMaterial({ project: riverside._id, materialName: "Steel", type: "Received", date: new Date("2026-07-10"), quantity: 5, unit: "MT", party: "SAIL Depot", receiptStatus: "Pending", createdBy: priya.user._id });
  await ensureMaterial({ project: riverside._id, materialName: "Cement", type: "Used", date: new Date("2026-07-09"), quantity: 20, unit: "bags", createdBy: rakesh.user._id });
  await ensureMaterial({ project: riverside._id, materialName: "Cement", type: "Used", date: new Date("2026-07-10"), quantity: 18, unit: "bags", createdBy: rakesh.user._id });

  // Summary
  const [projectCount, woCount, labourCount] = await Promise.all([
    Project.countDocuments({ isDeleted: { $ne: true } }),
    WorkOrder.countDocuments({ isDeleted: { $ne: true } }),
    Labour.countDocuments({ isDeleted: { $ne: true } }),
  ]);
  const materialCount = await Material.countDocuments({ isDeleted: { $ne: true } });
  console.log("\n=== Demo data ===");
  console.log("Accounts: 1 Super Admin + 2 Managers + 3 Contractors + 1 Supervisor");
  console.log(`Projects: ${projectCount} · Work orders: ${woCount} · Labour: ${labourCount} · Materials: ${materialCount}`);
  console.log("\nPasswords:");
  console.log(`  • Super Admin: ${process.env.SEED_SUPERADMIN_PASSWORD || DEMO_PASSWORD}`);
  console.log(`  • Managers, Contractors & Supervisor: ${DEMO_PASSWORD}`);
  console.log("  Logins: SA 9999999999 · Priya 9810000001 · Arjun 9810000002 ·");
  console.log("          Vikram 9820000001 · Salman 9820000002 · Faizan 9820000003 ·");
  console.log("          Rakesh (supervisor) 9830000001\n");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("[seed-demo] failed:", err.message);
  process.exit(1);
});
