import { Doctor } from "../models/Doctor";
import { Payment } from "../models/Payment";
import { Review } from "../models/Review";
import { sameId } from "../utils/helpers";

/* All response shaping lives here. User output is a strict whitelist so a password hash can never leak. */

export interface Viewer {
  id: string;
  role: string;
}

export async function toUserDTOs(users: any[]) {
  const doctorUserIds = users.filter((u) => u.role === "doctor").map((u) => u._id);
  const profiles = doctorUserIds.length ? await Doctor.find({ user: { $in: doctorUserIds } }).select("user").lean() : [];
  const byUser = new Map<string, string>(profiles.map((d: any) => [String(d.user), String(d._id)]));
  return users.map((u) => ({
    _id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone ?? undefined,
    isActive: u.isActive,
    doctorId: byUser.get(String(u._id)),
    createdAt: u.createdAt,
  }));
}

export const toUserDTO = async (user: any) => (await toUserDTOs([user]))[0];

export const specialtyDTO = (s: any) =>
  s && {
    _id: String(s._id),
    name: s.name,
    slug: s.slug,
    description: s.description,
    isActive: s.isActive,
  };

/** Doctor with populated `user` (name/email/phone) and `specialty`. Contact details only when includeContact. */
export function toDoctorDTO(d: any, includeContact: boolean) {
  const u = d.user ?? {};
  return {
    _id: String(d._id),
    user: includeContact
      ? { _id: String(u._id), name: u.name, email: u.email, phone: u.phone }
      : { _id: String(u._id), name: u.name },
    specialty: specialtyDTO(d.specialty),
    bio: d.bio,
    qualifications: d.qualifications ?? [],
    experienceYears: d.experienceYears,
    consultationFee: d.consultationFee,
    slotDurationMinutes: d.slotDurationMinutes,
    availability: (d.availability ?? []).map((a: any) => ({ dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime })),
    isApproved: d.isApproved,
    ratingAvg: d.ratingAvg,
    ratingCount: d.ratingCount,
    createdAt: d.createdAt,
  };
}

export const canSeeDoctorContact = (d: any, viewer?: Viewer) =>
  !!viewer && (viewer.role === "admin" || sameId(d.user?._id ?? d.user, viewer.id));

export const toPaymentDTO = (p: any) =>
  p && {
    _id: String(p._id),
    appointment: String(p.appointment),
    patient: String(p.patient),
    amount: p.amount,
    currency: p.currency,
    method: p.method,
    status: p.status,
    transactionRef: p.transactionRef,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
  };

export const toReviewDTO = (r: any) =>
  r && {
    _id: String(r._id),
    appointment: String(r.appointment),
    patient: r.patient && typeof r.patient === "object" && "name" in r.patient
      ? { _id: String(r.patient._id), name: r.patient.name }
      : { _id: String(r.patient) },
    doctor: String(r.doctor),
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
  };

/** Expects lean appointments with populated patient and doctor(user, specialty). Attaches payment + review. */
export async function toAppointmentDTOs(appts: any[]) {
  if (!appts.length) return [];
  const ids = appts.map((a) => a._id);
  const [payments, reviews] = await Promise.all([
    Payment.find({ appointment: { $in: ids } }).lean(),
    Review.find({ appointment: { $in: ids } }).populate("patient", "name").lean(),
  ]);
  const payBy = new Map<string, any>(payments.map((p: any) => [String(p.appointment), p]));
  const revBy = new Map<string, any>(reviews.map((r: any) => [String(r.appointment), r]));
  return appts.map((a) => ({
    _id: String(a._id),
    patient: { _id: String(a.patient._id), name: a.patient.name, email: a.patient.email, phone: a.patient.phone },
    doctor: toDoctorDTO(a.doctor, true),
    date: a.date,
    startTime: a.startTime,
    endTime: a.endTime,
    status: a.status,
    reason: a.reason,
    notes: a.notes,
    cancelledBy: a.cancelledBy ? String(a.cancelledBy) : undefined,
    payment: toPaymentDTO(payBy.get(String(a._id))),
    review: toReviewDTO(revBy.get(String(a._id))),
    createdAt: a.createdAt,
  }));
}
