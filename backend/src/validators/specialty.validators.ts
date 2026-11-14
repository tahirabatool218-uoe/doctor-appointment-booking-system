import { z } from "zod";

const description = z.string().trim().max(500);

export const createSpecialtySchema = z.object({ name: z.string().trim().min(2).max(100), description: description.optional() });
export const updateSpecialtySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: description.optional(),
  isActive: z.boolean().optional(),
});
