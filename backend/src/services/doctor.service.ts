import { Types } from "mongoose";
import { Doctor } from "../models/Doctor";
import { Appointment } from "../models/Appointment";
import { Review } from "../models/Review";
import { AvailabilityWindow, clinicNow, generateSlots, isPastSlot, toMinutes } from "../utils/time";

export const DOCTOR_POPULATE = [
  { path: "user", select: "name email phone isActive" },
  { path: "specialty" },
];

export async function getDoctorIdForUser(userId: string): Promise<string | null> {
  const d = await Doctor.findOne({ user: userId }).select("_id").lean();
  return d ? String(d._id) : null;
}

export async function findDoctorPopulated(id: string): Promise<any | null> {
  return Doctor.findById(id).populate(DOCTOR_POPULATE).lean();
}

/** Slots for a date with `available` = not booked and not in the past. */
export async function getSlotsForDate(doctor: any, date: string) {
  const all = generateSlots(doctor.availability ?? [], doctor.slotDurationMinutes, date);
  const booked = await Appointment.find({ doctor: doctor._id, date, status: { $in: ["pending", "confirmed"] } })
    .select("startTime")
    .lean();
  const taken = new Set(booked.map((b) => b.startTime));
  return all.map((s) => ({ ...s, available: !taken.has(s.startTime) && !isPastSlot(date, toMinutes(s.startTime)) }));
}

/** Denormalised rating on the doctor document, recomputed whenever a review is added or removed. */
export async function recalcDoctorRating(doctorIdLike: unknown): Promise<void> {
  const doctorId = new Types.ObjectId(String(doctorIdLike)); // aggregate() does not auto-cast ids
  const [agg] = await Review.aggregate([
    { $match: { doctor: doctorId } },
    { $group: { _id: "$doctor", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Doctor.updateOne(
    { _id: doctorId },
    { $set: { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg ? agg.count : 0 } }
  );
}

/**
 * Future pending/confirmed appointments that would no longer fit a proposed schedule.
 * Used to refuse schedule changes that would strand already-booked patients.
 */
export async function findAvailabilityConflicts(doctorId: unknown, availability: AvailabilityWindow[], slotMinutes: number) {
  const appts = await Appointment.find({
    doctor: doctorId,
    date: { $gte: clinicNow().date },
    status: { $in: ["pending", "confirmed"] },
  })
    .select("date startTime")
    .lean();
  return appts
    .filter((a) => !generateSlots(availability, slotMinutes, a.date).some((s) => s.startTime === a.startTime))
    .map((a) => ({ appointment: String(a._id), date: a.date, startTime: a.startTime }));
}
