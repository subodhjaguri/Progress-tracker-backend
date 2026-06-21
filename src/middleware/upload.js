import multer from "multer";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/plain",
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new ApiError(400, `Unsupported file type: ${file.mimetype}`));
  },
});
