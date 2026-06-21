import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { baseSchema } from "./plugins/base.js";
import { ROLES, USER_STATUS } from "../constants/enums.js";
import { maskAadhaar } from "../utils/mask.js";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, default: null },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: Object.values(ROLES), required: true },
  status: {
    type: String,
    enum: Object.values(USER_STATUS),
    default: USER_STATUS.ACTIVE,
  },
  mustChangePassword: { type: Boolean, default: false },

  // Contractor profile (role = CONTRACTOR)
  aadhaarNumber: { type: String, default: null },
  address: { type: String, default: null },
  profilePhoto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document",
    default: null,
  },
});

baseSchema(userSchema, {
  scrub(ret) {
    delete ret.passwordHash;
    if (ret.aadhaarNumber) ret.aadhaarNumber = maskAadhaar(ret.aadhaarNumber);
  },
});

// One active account per mobile (soft-deleted rows don't block reuse).
userSchema.index(
  { mobile: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
userSchema.index({ role: 1 });
userSchema.index({ createdBy: 1 });

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 10);
};

export const User = mongoose.model("User", userSchema);
