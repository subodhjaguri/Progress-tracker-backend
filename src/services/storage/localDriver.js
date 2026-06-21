import fs from "node:fs";
import path from "node:path";
import { env } from "../../config/env.js";

const root = path.resolve(env.uploadDir);

export async function save({ buffer, key }) {
  const full = path.join(root, key);
  await fs.promises.mkdir(path.dirname(full), { recursive: true });
  await fs.promises.writeFile(full, buffer);
  return { key };
}

/** Returns a Readable stream of the stored object. */
export function createReadStream(key) {
  return fs.createReadStream(path.join(root, key));
}

export async function remove(key) {
  await fs.promises.rm(path.join(root, key), { force: true });
}
