import { z } from "zod";
import { emailField, nameField, passwordField, phoneField } from "./common.validators";

// NOTE: there is deliberately no `role` field. Unknown keys are stripped, and the
// controller always assigns role "patient", so clients can never self-assign a role.
export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
  phone: phoneField.optional(),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1).max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
