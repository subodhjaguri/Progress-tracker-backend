import { randomBytes } from "node:crypto";

/** Generate a readable temporary password (alphanumeric). */
export function generateTempPassword(length = 10) {
  return randomBytes(24)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, length);
}
