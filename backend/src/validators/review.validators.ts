import { z } from "zod";
import { objectId } from "./common.validators";
import { paginationSchema } from "../utils/pagination";

export const createReviewSchema = z.object({
  appointment: objectId,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});
export const listReviewsQuery = paginationSchema;

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
