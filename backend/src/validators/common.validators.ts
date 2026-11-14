import { z } from "zod";
import { OBJECT_ID_RE } from "../utils/helpers";
import { TIME_RE, isRealDate } from "../utils/time";

export const objectId = z.string().regex(OBJECT_ID_RE, "Invalid id");
export const idParam = z.object({ id: objectId });
export const dateString = z.string().refine(isRealDate, "Date must be a valid YYYY-MM-DD");
export const timeString = z.string().regex(TIME_RE, "Time must be HH:mm");

export const nameField = z.string().trim().min(2).max(100);
export const emailField = z.string().trim().toLowerCase().email().max(254);
// bcrypt only uses the first 72 bytes, so cap there.
export const passwordField = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72)
  .regex(/[A-Za-z]/, "Include a letter")
  .regex(/\d/, "Include a number");
// Empty string is accepted (frontend sends "" for no phone) and treated as "not provided".
export const phoneField = z
  .string()
  .trim()
  .regex(/^$|^[+\d][\d\s-]{6,17}$/, "Invalid phone number")
  .transform((v) => (v === "" ? undefined : v));
