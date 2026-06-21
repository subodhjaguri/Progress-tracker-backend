import { ApiError } from "../utils/ApiError.js";

/** Allow only the given roles; expects `authenticate` to have run first. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden("You do not have permission to perform this action"),
      );
    }
    next();
  };
}
