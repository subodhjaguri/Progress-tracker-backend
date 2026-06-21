import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB() {
  if (!env.mongoUri) {
    throw new Error(
      "MONGO_URI is not set. Add your hosted MongoDB connection string to backend/.env",
    );
  }

  mongoose.set("strictQuery", true);

  mongoose.connection.on("error", (err) => {
    console.error("[db] connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[db] disconnected");
  });

  await mongoose.connect(env.mongoUri);
  console.log("[db] connected to MongoDB");
  return mongoose.connection;
}
