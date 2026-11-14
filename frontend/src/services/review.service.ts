import { http } from "@/lib/axios";
import type { CreateReviewPayload, Review } from "@/types";

export const reviewService = {
  create: (p: CreateReviewPayload) => http.post<{ data: Review }>("/reviews", p).then((r) => r.data.data),
};
