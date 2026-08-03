import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../src/config/db.js";

async function inspectAll() {
  await connectDB();
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  console.log("=== Inspecting DB Collections ===");
  for (const colInfo of collections) {
    const colName = colInfo.name;
    const col = db.collection(colName);
    const total = await col.countDocuments({});
    
    // Find documents created today (2026-08-01) or with createdAt today
    const startOfDay = new Date("2026-08-01T00:00:00.000Z");
    const createdToday = await col.countDocuments({
      createdAt: { $gte: startOfDay }
    });

    console.log(`\nCollection: [${colName}] | Total: ${total} | Created Today: ${createdToday}`);
    const docs = await col.find({}).project({ name: 1, title: 1, mobile: 1, role: 1, code: 1, createdAt: 1 }).toArray();
    docs.forEach((d) => {
      console.log(`  - ID: ${d._id} | Name/Title/Code: ${d.name || d.title || d.code || d.mobile} | CreatedAt: ${d.createdAt}`);
    });
  }

  await mongoose.disconnect();
}

inspectAll().catch((err) => {
  console.error("Inspect error:", err);
  process.exit(1);
});
