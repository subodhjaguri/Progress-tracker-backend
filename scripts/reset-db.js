/**
 * Wipe every record from the database so a fresh round of testing can start.
 *
 * DESTRUCTIVE AND IRREVERSIBLE. There is no backup step here — if the data
 * matters, take a dump first (`mongodump --uri "$MONGO_URI"`).
 *
 *   node scripts/reset-db.js                          # dry run: shows what WOULD be deleted
 *   node scripts/reset-db.js --confirm=<db-name>      # actually wipe, then re-seed the Super Admin
 *   node scripts/reset-db.js --confirm=<db> --no-seed # wipe and leave the database empty
 *   node scripts/reset-db.js --confirm=<db> --uploads # also delete locally stored files
 *
 * The database name must be typed out in --confirm. That is deliberate: it makes
 * it impossible to wipe the wrong environment by re-running a shell command.
 *
 * The app has no public sign-up — accounts are created top-down from the Super
 * Admin — so the Super Admin is re-created by default from SEED_SUPERADMIN_* in
 * .env. Skipping that with --no-seed leaves nobody able to log in.
 */
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { ROLES, USER_STATUS } from "../src/constants/enums.js";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const confirmed = value("confirm");
const skipSeed = flag("no-seed");
const clearUploads = flag("uploads");

// Collections Mongo keeps for itself — never touch these.
const SYSTEM = /^(system\.|admin$|local$|config$)/;

async function emptyUploads() {
  const dir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch {
    console.log(`[reset] no upload directory at ${dir} — skipping`);
    return;
  }
  for (const entry of entries) {
    await fs.rm(path.join(dir, entry), { recursive: true, force: true });
  }
  console.log(`[reset] cleared ${entries.length} entr(ies) from ${dir}`);
}

async function seedSuperAdmin() {
  const name = process.env.SEED_SUPERADMIN_NAME || "Owner";
  const mobile = process.env.SEED_SUPERADMIN_MOBILE;
  const password = process.env.SEED_SUPERADMIN_PASSWORD;
  const email = process.env.SEED_SUPERADMIN_EMAIL || null;

  if (!mobile || !password) {
    console.error(
      "[reset] Database is empty but SEED_SUPERADMIN_MOBILE / _PASSWORD are not set,\n" +
        "        so no login could be created. Set them in backend/.env and run\n" +
        "        `npm run seed` before handing the app to testers.",
    );
    return;
  }

  const su = await User.create({
    name,
    mobile,
    email,
    passwordHash: await User.hashPassword(password),
    role: ROLES.SUPER_ADMIN,
    status: USER_STATUS.ACTIVE,
  });
  console.log(`[reset] Super Admin re-created: ${su.name} (mobile ${su.mobile})`);
  console.log("[reset] Password is SEED_SUPERADMIN_PASSWORD from .env — check it before sharing.");
}

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("[reset] MONGO_URI is not set in backend/.env — refusing to run.");
    process.exit(1);
  }

  await connectDB();
  const db = mongoose.connection.db;
  const dbName = db.databaseName;

  const collections = (await db.listCollections().toArray())
    .map((c) => c.name)
    .filter((n) => !SYSTEM.test(n))
    .sort();

  const counts = {};
  let total = 0;
  for (const name of collections) {
    counts[name] = await db.collection(name).countDocuments({});
    total += counts[name];
  }

  console.log(`\n[reset] target database : ${dbName}`);
  console.log(`[reset] host            : ${mongoose.connection.host}`);
  console.log(`[reset] documents       : ${total} across ${collections.length} collection(s)\n`);
  for (const name of collections) {
    console.log(`          ${name.padEnd(22)} ${counts[name]}`);
  }

  if (confirmed !== dbName) {
    console.log(
      `\n[reset] DRY RUN — nothing was deleted.\n` +
        `        To wipe the data above, re-run with the database name spelled out:\n\n` +
        `          node scripts/reset-db.js --confirm=${dbName}\n\n` +
        `        Add --uploads to delete stored files too, or --no-seed to skip\n` +
        `        re-creating the Super Admin (which would leave nobody able to log in).\n`,
    );
    await mongoose.disconnect();
    return;
  }

  console.log(`\n[reset] wiping ${dbName}…`);
  for (const name of collections) {
    // deleteMany rather than drop: keeps the collections and their indexes
    // (notably the unique index on users.mobile) intact.
    const { deletedCount } = await db.collection(name).deleteMany({});
    console.log(`          ${name.padEnd(22)} removed ${deletedCount}`);
  }

  if (clearUploads) await emptyUploads();
  if (!skipSeed) await seedSuperAdmin();

  let left = 0;
  for (const name of collections) left += await db.collection(name).countDocuments({});
  console.log(`\n[reset] done — ${left} document(s) remain.\n`);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("[reset] failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
