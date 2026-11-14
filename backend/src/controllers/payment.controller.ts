import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { paginate } from "../utils/pagination";
import { sendData, sendList } from "../utils/response";
import { sameId } from "../utils/helpers";
import { Appointment } from "../models/Appointment";
import { Doctor } from "../models/Doctor";
import { Payment, PaymentStatus } from "../models/Payment";
import { getDoctorIdForUser } from "../services/doctor.service";
import { toPaymentDTO } from "../services/serializers";
import type { ListPaymentsQuery, PayInput, UpdatePaymentStatusInput } from "../validators/payment.validators";

/**
 * Simulated payment: there is no external gateway. Marking a payment "paid" records the method and
 * reference supplied by the client. Swap this handler for a real gateway integration when needed.
 */
export const payForAppointment = asyncHandler(async (req, res) => {
  const { method, transactionRef } = req.body as PayInput;
  const appt = await Appointment.findById(req.params.appointmentId).select("patient status").lean();
  if (!appt) throw new AppError(404, "NOT_FOUND", "Appointment not found");
  if (!sameId(appt.patient, req.user!.id)) throw new AppError(403, "FORBIDDEN", "You can only pay for your own appointments");
  if (appt.status === "cancelled" || appt.status === "no_show") {
    throw new AppError(400, "INVALID_STATE", `Cannot pay for an appointment that is ${appt.status}`);
  }

  // Atomic pending/failed -> paid, so concurrent requests can't both succeed.
  const paid = await Payment.findOneAndUpdate(
    { appointment: appt._id, status: { $in: ["pending", "failed"] } },
    { $set: { status: "paid", method, transactionRef, paidAt: new Date() } },
    { new: true }
  ).lean();
  if (!paid) {
    const existing = await Payment.findOne({ appointment: appt._id }).select("status").lean();
    if (!existing) throw new AppError(404, "NOT_FOUND", "Payment record not found");
    throw new AppError(409, "CONFLICT", `Payment is already ${existing.status}`);
  }

  // Re-check after the atomic update: if the appointment was cancelled concurrently (after our first
  // read but before the payment was written), its refund step saw nothing to refund. Undo the charge here.
  const after = await Appointment.findById(appt._id).select("status").lean();
  if (after && (after.status === "cancelled" || after.status === "no_show")) {
    await Payment.updateOne({ _id: paid._id, status: "paid" }, { $set: { status: "refunded" } });
    throw new AppError(409, "CONFLICT", `Appointment is ${after.status}; the payment was not kept`);
  }
  sendData(res, toPaymentDTO(paid));
});

export const listPayments = asyncHandler(async (req, res) => {
  const q = req.query as unknown as ListPaymentsQuery;
  const { page, limit, skip } = paginate(q);
  const user = req.user!;

  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status;
  if (user.role === "patient") filter.patient = user.id;
  else if (user.role === "doctor") {
    const myDoctorId = await getDoctorIdForUser(user.id);
    if (!myDoctorId) return sendList(res, [], { page, limit, total: 0 });
    filter.appointment = { $in: await Appointment.find({ doctor: myDoctorId }).distinct("_id") };
  }

  const [items, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Payment.countDocuments(filter),
  ]);
  sendList(res, items.map(toPaymentDTO), { page, limit, total });
});

export const getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).lean();
  if (!payment) throw new AppError(404, "NOT_FOUND", "Payment not found");

  const user = req.user!;
  let allowed = user.role === "admin" || sameId(payment.patient, user.id);
  if (!allowed && user.role === "doctor") {
    const appt = await Appointment.findById(payment.appointment).select("doctor").lean();
    allowed = !!appt && sameId(appt.doctor, await getDoctorIdForUser(user.id));
  }
  if (!allowed) throw new AppError(403, "FORBIDDEN", "You do not have access to this payment");
  sendData(res, toPaymentDTO(payment));
});

export const refundPayment = asyncHandler(async (req, res) => {
  const refunded = await Payment.findOneAndUpdate(
    { _id: req.params.id, status: "paid" },
    { $set: { status: "refunded" } },
    { new: true }
  ).lean();
  if (!refunded) {
    const existing = await Payment.findById(req.params.id).select("status").lean();
    if (!existing) throw new AppError(404, "NOT_FOUND", "Payment not found");
    throw new AppError(400, "INVALID_STATE", `Only paid payments can be refunded (current status: ${existing.status})`);
  }
  sendData(res, toPaymentDTO(refunded));
});

/**
 * Creates the payment record for an appointment that doesn't have one (normally it is created at booking).
 * The amount is always taken from the doctor's fee, never from the client.
 */
export const createPayment = asyncHandler(async (req, res) => {
  const { appointment } = req.body as { appointment: string };
  const appt = await Appointment.findById(appointment).select("patient doctor status").lean();
  if (!appt) throw new AppError(404, "NOT_FOUND", "Appointment not found");

  const user = req.user!;
  if (user.role !== "admin" && !sameId(appt.patient, user.id)) {
    throw new AppError(403, "FORBIDDEN", "You can only create payments for your own appointments");
  }
  if (appt.status === "cancelled" || appt.status === "no_show") {
    throw new AppError(400, "INVALID_STATE", `Cannot create a payment for an appointment that is ${appt.status}`);
  }
  const doctor = await Doctor.findById(appt.doctor).select("consultationFee").lean();
  if (!doctor) throw new AppError(404, "NOT_FOUND", "Doctor not found");

  try {
    const payment = await Payment.create({ appointment: appt._id, patient: appt.patient, amount: doctor.consultationFee, status: "pending" });
    sendData(res, toPaymentDTO(payment), 201);
  } catch (err: any) {
    if (err?.code === 11000) throw new AppError(409, "CONFLICT", "A payment already exists for this appointment");
    throw err;
  }
});

const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["paid", "failed"],
  failed: ["paid", "pending"],
  paid: ["refunded"],
  refunded: [],
};

/**
 * Authorised status updates (no gateway). Admin: any valid transition. The appointment's doctor: may only
 * record a cash payment as received (pending/failed -> paid with method "cash"). Patients use /pay instead.
 */
export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { status, method, transactionRef } = req.body as UpdatePaymentStatusInput;
  const user = req.user!;

  const payment = await Payment.findById(req.params.id).lean();
  if (!payment) throw new AppError(404, "NOT_FOUND", "Payment not found");

  if (user.role === "doctor") {
    const appt = await Appointment.findById(payment.appointment).select("doctor").lean();
    if (!appt || !sameId(appt.doctor, await getDoctorIdForUser(user.id))) {
      throw new AppError(403, "FORBIDDEN", "You do not have access to this payment");
    }
    if (status !== "paid" || method !== "cash") {
      throw new AppError(403, "FORBIDDEN", "Doctors can only record a cash payment as received");
    }
  }

  if (!PAYMENT_TRANSITIONS[payment.status].includes(status)) {
    throw new AppError(400, "INVALID_TRANSITION", `Cannot change payment from ${payment.status} to ${status}`);
  }
  if (status === "paid" && !(method ?? payment.method)) {
    throw new AppError(400, "VALIDATION_ERROR", "A payment method is required to mark a payment as paid");
  }

  const set: Record<string, unknown> = { status };
  if (method !== undefined) set.method = method;
  if (transactionRef !== undefined) set.transactionRef = transactionRef;
  if (status === "paid") set.paidAt = new Date();

  // Compare-and-set on the old status so concurrent updates can't both apply.
  const updated = await Payment.findOneAndUpdate({ _id: payment._id, status: payment.status }, { $set: set }, { new: true }).lean();
  if (!updated) throw new AppError(409, "CONFLICT", "Payment was modified by someone else; please retry");
  sendData(res, toPaymentDTO(updated));
});
