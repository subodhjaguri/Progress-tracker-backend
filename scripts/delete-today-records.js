import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../src/config/db.js";

async function deleteTodayRecords() {
  await connectDB();
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  const startOfDay = new Date("2026-08-01T00:00:00.000Z");

  console.log("=== Deleting All Records Created Today (Aug 1, 2026) ===");
  for (const colInfo of collections) {
    const colName = colInfo.name;
    if (colName === "counters") continue; // keep counters
    const col = db.collection(colName);
    
    const result = await col.deleteMany({
      createdAt: { $gte: startOfDay }
    });

    console.log(`Collection [${colName}]: Deleted ${result.deletedCount} records created today`);
  }

  console.log("\n=== Inspection After Deleting Today's Records ===");
  for (const colInfo of collections) {
    const colName = colInfo.name;
    const col = db.collection(colName);
    const total = await col.countDocuments({});
    console.log(`Collection [${colName}]: ${total} remaining records`);
  }

  await mongoose.disconnect();
}

deleteTodayRecords().catch((err) => {
  console.error("Delete error:", err);
  process.exit(1);
});
