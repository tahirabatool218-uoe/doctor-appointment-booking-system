import { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

const fail = (code: string, message: string, details?: unknown) => ({ error: { code, message, ...(details ? { details } : {}) } });

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json(fail("NOT_FOUND", "Route not found"));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return res.status(400).json(fail("VALIDATION_ERROR", "Invalid request", details));
  }
  if (err instanceof AppError) {
    return res.status(err.status).json(fail(err.code, err.message, err.details));
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return res.status(400).json(fail("VALIDATION_ERROR", "Invalid request", details));
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json(fail("VALIDATION_ERROR", `Invalid value for ${err.path}`));
  }
  if (err?.code === 11000) {
    return res.status(409).json(fail("CONFLICT", "Duplicate resource"));
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json(fail("INVALID_JSON", "Request body is not valid JSON"));
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json(fail("PAYLOAD_TOO_LARGE", "Request body too large"));
  }
  if (env.NODE_ENV !== "test") console.error(err);
  res.status(500).json(fail("INTERNAL_ERROR", "Something went wrong"));
};
