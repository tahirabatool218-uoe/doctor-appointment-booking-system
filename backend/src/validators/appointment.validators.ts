import { z } from "zod";
import { dateString, objectId, timeString } from "./common.validators";
import { paginationSchema } from "../utils/pagination";
import { APPOINTMENT_STATUSES } from "../models/Appointment";

export const createAppointmentSchema = z.object({
  doctor: objectId,
  date: dateString,
  startTime: timeString,
  reason: z.string().trim().max(500).optional(),
});

export const listAppointmentsQuery = paginationSchema
  .extend({
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    date: dateString.optional(),
    from: dateString.optional(), // inclusive date range
    to: dateString.optional(),
    // Only honoured for admins (doctors/patients are already scoped to themselves):
    doctor: objectId.optional(),
    patient: objectId.optional(),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, { message: "from must not be after to", path: ["from"] });

// Doctor (or admin) answers a pending appointment request.
export const respondSchema = z.object({
  action: z.enum(["accept", "reject"]),
  reason: z.string().trim().max(500).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(["confirmed", "completed", "cancelled", "no_show"]),
  notes: z.string().trim().max(2000).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuery>;
export type RespondInput = z.infer<typeof respondSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
