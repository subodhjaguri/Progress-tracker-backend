import { Counter } from "../models/Counter.js";

const PREFIX = { project: "PRJ", workOrder: "WO" };

/** Atomically produce the next code for a kind, e.g. nextCode("project") -> "PRJ-001". */
export async function nextCode(kind) {
  const doc = await Counter.findByIdAndUpdate(
    kind,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  const prefix = PREFIX[kind] || kind.toUpperCase();
  return `${prefix}-${String(doc.seq).padStart(3, "0")}`;
}
