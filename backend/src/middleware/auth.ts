import { RequestHandler } from "express";
import { AppError } from "../utils/AppError";
import { verifyToken, JwtPayload } from "../utils/jwt";
import { User, Role } from "../models/User";

const extractToken = (header?: string): string | undefined =>
  header?.startsWith("Bearer ") ? header.slice(7).trim() || undefined : undefined;

async function resolveUser(token: string): Promise<{ id: string; role: Role }> {
  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token");
  }
  // Role is read from the DB (not the token) so role changes / deactivation apply immediately.
  const user = await User.findById(payload.sub).select("role isActive");
  if (!user || !user.isActive) throw new AppError(401, "UNAUTHORIZED", "Invalid account");
  return { id: String(user._id), role: user.role };
}

/** Requires a valid Bearer token. Sets req.user = { id, role }. */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    if (!token) throw new AppError(401, "UNAUTHORIZED", "Missing token");
    req.user = await resolveUser(token);
    next();
  } catch (err) {
    next(err);
  }
};

/** For public routes whose output differs for admins/owners. Bad or missing tokens => anonymous. */
export const optionalAuthenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    if (token) {
      try {
        req.user = await resolveUser(token);
      } catch (err) {
        if (!(err instanceof AppError)) throw err; // real failures (e.g. DB down) still surface
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(new AppError(401, "UNAUTHORIZED", "Not authenticated"));
    if (!roles.includes(req.user.role)) return next(new AppError(403, "FORBIDDEN", "Insufficient permissions"));
    next();
  };
