import { z } from "zod";
import { nameField, phoneField } from "./common.validators";
import { paginationSchema } from "../utils/pagination";
import { ROLES } from "../models/User";

export const listUsersQuery = paginationSchema.extend({ role: z.enum(ROLES).optional() });
export const updateMeSchema = z.object({ name: nameField.optional(), phone: phoneField.optional() });
// Admins may toggle status and move users between admin/patient. Doctor accounts are managed via /doctors.
export const adminUpdateUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(["admin", "patient"]).optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuery>;
