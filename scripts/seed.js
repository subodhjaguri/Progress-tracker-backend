import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { ROLES, USER_STATUS } from "../src/constants/enums.js";

async function run() {
  await connectDB();

  const name = process.env.SEED_SUPERADMIN_NAME || "Owner";
  const mobile = process.env.SEED_SUPERADMIN_MOBILE;
  const password = process.env.SEED_SUPERADMIN_PASSWORD;
  const email = process.env.SEED_SUPERADMIN_EMAIL || null;

  if (!mobile || !password) {
    console.error(
      "[seed] Set SEED_SUPERADMIN_MOBILE and SEED_SUPERADMIN_PASSWORD in backend/.env",
    );
    process.exit(1);
  }

  const existing = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (existing) {
    console.log(
      `[seed] Super Admin already exists (mobile ${existing.mobile}). Nothing to do.`,
    );
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await User.hashPassword(password);
  const su = await User.create({
    name,
    mobile,
    email,
    passwordHash,
    role: ROLES.SUPER_ADMIN,
    status: USER_STATUS.ACTIVE,
  });

  console.log(`[seed] Created Super Admin: ${su.name} (mobile ${su.mobile})`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("[seed] failed:", err.message);
  process.exit(1);
});
