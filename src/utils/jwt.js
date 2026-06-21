import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signToken(user) {
  const id = user._id ? user._id.toString() : user.id;
  return jwt.sign({ sub: id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
