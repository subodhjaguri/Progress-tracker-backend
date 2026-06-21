import { ApiError } from "../utils/ApiError.js";

/** Validate req[source] against a zod schema; replaces it with the parsed result. */
export function validate(schema, source = "body") {
  return (req, res, next) => {
    // Body can be undefined when no JSON payload is sent; treat as empty object so
    // optional-only schemas validate cleanly.
    const input = req[source] ?? {};
    const result = schema.safeParse(input);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return next(ApiError.badRequest("Validation failed", details));
    }
    req[source] = result.data;
    next();
  };
}
