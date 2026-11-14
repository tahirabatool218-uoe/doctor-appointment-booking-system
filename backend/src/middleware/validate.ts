import { RequestHandler } from "express";
import { ZodTypeAny } from "zod";

type Source = "body" | "query" | "params";

/** Validates (and strips unknown keys from) the request part; failures go to errorHandler as 400. */
export const validate =
  (schema: ZodTypeAny, source: Source = "body"): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    (req as any)[source] = result.data;
    next();
  };
