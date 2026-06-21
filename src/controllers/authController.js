import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/response.js";
import { signToken } from "../utils/jwt.js";
import { User } from "../models/User.js";
import { USER_STATUS } from "../constants/enums.js";

export const login = asyncHandler(async (req, res) => {
  const { mobile, password } = req.body;
  const user = await User.findOne({ mobile });
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Invalid mobile or password");
  }
  if (user.status !== USER_STATUS.ACTIVE) {
    throw ApiError.forbidden("Account is inactive");
  }
  const token = signToken(user);
  sendSuccess(res, { token, user });
});

export const me = asyncHandler(async (req, res) => {
  sendSuccess(res, { user: req.user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest("Current password is incorrect");
  }
  user.passwordHash = await User.hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();
  sendSuccess(res, { message: "Password updated" });
});
