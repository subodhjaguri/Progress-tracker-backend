import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyToken } from "../utils/jwt.js";
import { User } from "../models/User.js";
import { USER_STATUS } from "../constants/enums.js";

/** Verify the bearer token, load the user, attach as req.user. */
export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized("Missing bearer token");

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized("Invalid or expired token");
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized("User no longer exists");
  if (user.status !== USER_STATUS.ACTIVE) {
    throw ApiError.forbidden("Account is inactive");
  }

  req.user = user;
  next();
});
