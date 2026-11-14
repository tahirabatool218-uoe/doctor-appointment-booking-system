import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "../models/User";

export interface JwtPayload {
  sub: string;
  role: Role;
}

export const signToken = (userId: string, role: Role): string =>
  jwt.sign({ sub: userId, role }, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });

export const verifyToken = (token: string): JwtPayload => {
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }) as unknown as JwtPayload;
  if (typeof payload?.sub !== "string") throw new Error("Malformed token");
  return payload;
};
