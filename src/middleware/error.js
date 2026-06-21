import { ApiError } from "../utils/ApiError.js";
import { isProd } from "../config/env.js";

/** 404 for unmatched routes. */
export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

/** Central error handler: maps known error shapes to the JSON error envelope. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let details = err.details;

  if (err.name === "ValidationError" && err.errors) {
    // Mongoose validation
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for "${err.path}"`;
  } else if (err.code === 11000) {
    // duplicate key
    statusCode = 409;
    message = "Duplicate value";
    details = err.keyValue;
  } else if (err.name === "MulterError") {
    statusCode = 400;
    message =
      err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message;
  }

  if (statusCode >= 500) console.error("[error]", err);

  res.status(statusCode).json({
    error: {
      code: statusCode,
      message,
      ...(details ? { details } : {}),
      ...(isProd ? {} : { stack: err.stack }),
    },
  });
}
