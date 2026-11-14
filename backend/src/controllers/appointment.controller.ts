import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { paginate } from "../utils/pagination";
import { sendData, sendList } from "../utils/response";
import { sameId } from "../utils/helpers";
import { env } from "../config/env";
import { generateSlots, isPastSlot, minutesUntilSlot, toMinutes } from "../utils/time";
import { Appointment, AppointmentStatus } from "../models/Appointment";
import { Payment } from "../models/Payment";
import { Doctor } from "../models/Doctor";
import { getDoctorIdForUser } from "../services/doctor.service";
import { APPT_POPULATE } from "../services/appointment.service";
import { toAppointmentDTOs } from "../services/serializers";
import type { CreateAppointmentInput, ListAppointmentsQuery, RespondInput, UpdateStatusInput } from "../validators/appointment.validators";


async function loadView(id: string) {
  const appt = await Appointment.findById(id).populate(APPT_POPULATE).lean();
  if (!appt) throw new AppError(404, "NOT_FOUND", "Appointment not found");
  return (await toAppointmentDTOs([appt]))[0];
}

/** Allowed status changes. Who may perform each is enforced separately below. */
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export const createAppointment = asyncHandler(async (req, res) => {
  const { doctor: doctorId, date, startTime, reason } = req.body as CreateAppointmentInput;

  const doctor: any = await Doctor.findById(doctorId).populate("user", "isActive").lean();
  if (!doctor || !doctor.isApproved || !doctor.user?.isActive) {
    throw new AppError(404, "NOT_FOUND", "Doctor not found or not available for booking");
  }

  const slot = generateSlots(doctor.availability, doctor.slotDurationMinutes, date).find((s) => s.startTime === startTime);
  if (!slot) throw new AppError(400, "INVALID_SLOT", "That time is outside the doctor's availability");
  if (isPastSlot(date, toMinutes(startTime))) throw new AppError(400, "INVALID_SLOT", "Cannot book a time in the past");

  let appt;
  try {
    // The unique partial index (doctor+date+startTime for active statuses) is what actually prevents double booking.
    appt = await Appointment.create({
      patient: req.user!.id,
      doctor: doctor._id,
      date,
      startTime,
      endTime: slot.endTime,
      reason,
      status: "pending",
    });
  } catch (err: any) {
    if (err?.code === 11000) throw new AppError(409, "SLOT_TAKEN", "This time slot has just been booked");
    throw err;
  }

  try {
    await Payment.create({ appointment: appt._id, patient: req.user!.id, amount: doctor.consultationFee, status: "pending" });
  } catch (err) {
    await Appointment.deleteOne({ _id: appt._id }); // never leave an appointment without its payment record
    throw err;
  }

  sendData(res, await loadView(String(appt._id)), 201);
});

export const listAppointments = asyncHandler(async (req, res) => {
  const q = req.query as unknown as ListAppointmentsQuery;
  const { page, limit, skip } = paginate(q);
  const user = req.user!;

  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (q.date) filter.date = q.date;
  else if (q.from || q.to) filter.date = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) };

  if (user.role === "admin") {
    if (q.doctor) filter.doctor = q.doctor;
    if (q.patient) filter.patient = q.patient;
  } else if (user.role === "patient") filter.patient = user.id;
  else if (user.role === "doctor") {
    const myDoctorId = await getDoctorIdForUser(user.id);
    if (!myDoctorId) return sendList(res, [], { page, limit, total: 0 });
    filter.doctor = myDoctorId;
  }

  const [items, total] = await Promise.all([
    Appointment.find(filter)
      .populate(APPT_POPULATE)
      .sort({ date: -1, startTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(filter),
  ]);
  sendList(res, await toAppointmentDTOs(items), { page, limit, total });
});

export const getAppointment = asyncHandler(async (req, res) => {
  const appt = await Appointment.findById(req.params.id).select("patient doctor").lean();
  if (!appt) throw new AppError(404, "NOT_FOUND", "Appointment not found");

  const user = req.user!;
  let allowed = user.role === "admin" || sameId(appt.patient, user.id);
  if (!allowed && user.role === "doctor") allowed = sameId(appt.doctor, await getDoctorIdForUser(user.id));
  if (!allowed) throw new AppError(403, "FORBIDDEN", "You do not have access to this appointment");

  sendData(res, await loadView(req.params.id));
});

interface ChangeOptions {
  /** Only the treating doctor or an admin may perform this change (used by accept/reject). */
  staffOnly?: boolean;
  /** The appointment must currently be pending. */
  requirePending?: boolean;
}

/** Single place where every appointment status change is authorised, validated and applied. */
async function changeStatus(
  user: { id: string; role: string },
  appointmentId: string,
  status: AppointmentStatus,
  notes: string | undefined,
  opts: ChangeOptions = {}
) {
  const appt = await Appointment.findById(appointmentId).lean();
  if (!appt) throw new AppError(404, "NOT_FOUND", "Appointment not found");

  const isAdmin = user.role === "admin";
  const isPatientOwner = user.role === "patient" && sameId(appt.patient, user.id);
  const isDoctorOwner = user.role === "doctor" && sameId(appt.doctor, await getDoctorIdForUser(user.id));

  if (!isAdmin && !isPatientOwner && !isDoctorOwner) {
    throw new AppError(403, "FORBIDDEN", "You do not have access to this appointment");
  }
  if (opts.staffOnly && isPatientOwner) {
    throw new AppError(403, "FORBIDDEN", "Only the doctor or an admin can respond to requests");
  }
  // Patients may only cancel; everything else is for the treating doctor or an admin.
  if (isPatientOwner && status !== "cancelled") {
    throw new AppError(403, "FORBIDDEN", "Patients can only cancel their appointments");
  }
  if (notes !== undefined && isPatientOwner) {
    throw new AppError(403, "FORBIDDEN", "Only the doctor or an admin can add notes");
  }
  if (opts.requirePending && appt.status !== "pending") {
    throw new AppError(400, "INVALID_TRANSITION", `Only pending requests can be answered (current status: ${appt.status})`);
  }
  if (!TRANSITIONS[appt.status].includes(status)) {
    throw new AppError(400, "INVALID_TRANSITION", `Cannot change status from ${appt.status} to ${status}`);
  }

  // Patient cancellation eligibility: not once the slot has started, and confirmed bookings need notice.
  if (isPatientOwner) {
    const minutes = minutesUntilSlot(appt.date, toMinutes(appt.startTime));
    if (minutes <= 0) throw new AppError(400, "CANCELLATION_NOT_ALLOWED", "This appointment has already started or passed");
    if (appt.status === "confirmed" && minutes < env.CANCELLATION_WINDOW_HOURS * 60) {
      throw new AppError(
        400,
        "CANCELLATION_NOT_ALLOWED",
        `Confirmed appointments can only be cancelled at least ${env.CANCELLATION_WINDOW_HOURS} hour(s) before the start time`
      );
    }
  }

  const set: Record<string, unknown> = { status };
  if (notes !== undefined) set.notes = notes;
  if (status === "cancelled") set.cancelledBy = user.id;

  // Compare-and-set on the old status so two concurrent changes can't both succeed.
  const updated = await Appointment.findOneAndUpdate({ _id: appt._id, status: appt.status }, { $set: set }, { new: true }).select("_id");
  if (!updated) throw new AppError(409, "CONFLICT", "Appointment was modified by someone else; please retry");

  // Cancelling a paid appointment automatically refunds its payment.
  if (status === "cancelled") {
    await Payment.updateOne({ appointment: appt._id, status: "paid" }, { $set: { status: "refunded" } });
  }

  return loadView(String(appt._id));
}

export const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body as UpdateStatusInput;
  sendData(res, await changeStatus(req.user!, req.params.id, status, notes));
});

/** Doctor (or admin) accepts or rejects a pending request. Rejecting cancels it; the reason is stored in notes. */
export const respondToAppointment = asyncHandler(async (req, res) => {
  const { action, reason } = req.body as RespondInput;
  const status: AppointmentStatus = action === "accept" ? "confirmed" : "cancelled";
  sendData(res, await changeStatus(req.user!, req.params.id, status, reason, { staffOnly: true, requirePending: true }));
});
