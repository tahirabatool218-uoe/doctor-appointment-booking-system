import { z } from "zod";
import { dateString, emailField, nameField, objectId, passwordField, timeString } from "./common.validators";
import { paginationSchema } from "../utils/pagination";
import { toMinutes } from "../utils/time";

const availabilityItem = z
  .object({ dayOfWeek: z.number().int().min(0).max(6), startTime: timeString, endTime: timeString })
  .refine((a) => toMinutes(a.startTime) < toMinutes(a.endTime), { message: "startTime must be before endTime" });

const availabilityList = z
  .array(availabilityItem)
  .max(28)
  .superRefine((list, ctx) => {
    const sorted = [...list].sort((a, b) => a.dayOfWeek - b.dayOfWeek || toMinutes(a.startTime) - toMinutes(b.startTime));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      if (prev.dayOfWeek === cur.dayOfWeek && toMinutes(cur.startTime) < toMinutes(prev.endTime)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Availability windows on the same day must not overlap" });
        return;
      }
    }
  });

const profileFields = {
  bio: z.string().trim().max(2000),
  qualifications: z.array(z.string().trim().min(1).max(120)).max(20),
  experienceYears: z.number().int().min(0).max(70),
  consultationFee: z.number().min(0).max(10_000_000),
  slotDurationMinutes: z.number().int().min(10).max(240),
  availability: availabilityList,
};

export const createDoctorSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
  specialty: objectId,
  consultationFee: profileFields.consultationFee,
  bio: profileFields.bio.optional(),
  qualifications: profileFields.qualifications.optional(),
  experienceYears: profileFields.experienceYears.optional(),
  slotDurationMinutes: profileFields.slotDurationMinutes.optional(),
  availability: profileFields.availability.optional(),
  isApproved: z.boolean().optional(),
});

export const updateDoctorSchema = z.object({
  bio: profileFields.bio.optional(),
  qualifications: profileFields.qualifications.optional(),
  experienceYears: profileFields.experienceYears.optional(),
  consultationFee: profileFields.consultationFee.optional(),
  slotDurationMinutes: profileFields.slotDurationMinutes.optional(),
  availability: profileFields.availability.optional(),
  specialty: objectId.optional(),
});

export const approveDoctorSchema = z.object({ isApproved: z.boolean() });

export const listDoctorsQuery = paginationSchema
  .extend({
    specialty: z.string().trim().max(100).optional(), // specialty id or slug
    q: z.string().trim().max(100).optional(), // matches doctor name
    minFee: z.coerce.number().min(0).optional(),
    maxFee: z.coerce.number().min(0).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    minExperience: z.coerce.number().int().min(0).optional(),
    availableOn: dateString.optional(), // only doctors who work on that weekday
    sort: z.enum(["rating", "fee_asc", "fee_desc", "experience", "newest"]).default("rating"),
    includeUnapproved: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
  })
  .refine((v) => v.minFee === undefined || v.maxFee === undefined || v.minFee <= v.maxFee, {
    message: "minFee must not exceed maxFee",
    path: ["minFee"],
  });

// Replaces the doctor's whole weekly schedule (an empty list clears it).
export const setAvailabilitySchema = z.object({
  availability: availabilityList,
  slotDurationMinutes: profileFields.slotDurationMinutes.optional(),
});
export const slotsQuery = z.object({ date: dateString });

export type ListDoctorsQuery = z.infer<typeof listDoctorsQuery>;
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
