import { Types } from "mongoose";
import { Appointment, APPOINTMENT_STATUSES, AppointmentStatus } from "../models/Appointment";
import { Doctor } from "../models/Doctor";
import { Payment, PAYMENT_STATUSES, PaymentStatus } from "../models/Payment";
import { Review } from "../models/Review";
import { Specialty } from "../models/Specialty";
import { User } from "../models/User";
import { clinicNow, lastNDates, toHHmm } from "../utils/time";
import { findAppointmentViews } from "./appointment.service";

const oid = (id: unknown) => new Types.ObjectId(String(id)); // aggregate() does not auto-cast ids

type StatusCounts = Record<AppointmentStatus, number>;

async function appointmentCounts(match: Record<string, unknown>) {
  const rows = await Appointment.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 } } }]);
  const byStatus = Object.fromEntries(APPOINTMENT_STATUSES.map((s) => [s, 0])) as StatusCounts;
  for (const r of rows) byStatus[r._id as AppointmentStatus] = r.count;
  return { total: Object.values(byStatus).reduce((a, b) => a + b, 0), byStatus };
}

/** Appointments per day for the last 7 clinic days (zero-filled), cancelled ones excluded. */
async function last7Days(match: Record<string, unknown>) {
  const dates = lastNDates(7);
  const rows = await Appointment.aggregate([
    { $match: { ...match, date: { $in: dates }, status: { $ne: "cancelled" } } },
    { $group: { _id: "$date", count: { $sum: 1 } } },
  ]);
  const by = new Map<string, number>(rows.map((r) => [r._id as string, r.count as number]));
  return dates.map((date) => ({ date, count: by.get(date) ?? 0 }));
}

/** Pending/confirmed appointments that haven't started yet. */
function upcomingFilter(base: Record<string, unknown>) {
  const now = clinicNow();
  return {
    ...base,
    status: { $in: ["pending", "confirmed"] },
    $or: [{ date: { $gt: now.date } }, { date: now.date, startTime: { $gt: toHHmm(now.minutes) } }],
  };
}

async function paymentTotals(match: Record<string, unknown>) {
  const rows = await Payment.aggregate([{ $match: match }, { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } }]);
  const byStatus = Object.fromEntries(PAYMENT_STATUSES.map((s) => [s, { count: 0, amount: 0 }])) as Record<PaymentStatus, { count: number; amount: number }>;
  for (const r of rows) byStatus[r._id as PaymentStatus] = { count: r.count, amount: r.amount };
  return byStatus;
}

export async function adminDashboard() {
  const today = clinicNow().date;
  const [userRows, inactiveUsers, doctorsTotal, doctorsPending, specialties, appts, todayCount, upcoming, trend, payments, topRows] =
    await Promise.all([
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      User.countDocuments({ isActive: false }),
      Doctor.countDocuments(),
      Doctor.countDocuments({ isApproved: false }),
      Specialty.countDocuments({ isActive: true }),
      appointmentCounts({}),
      Appointment.countDocuments({ date: today, status: { $ne: "cancelled" } }),
      Appointment.countDocuments(upcomingFilter({})),
      last7Days({}),
      paymentTotals({}),
      Appointment.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: "$doctor", completed: { $sum: 1 } } },
        { $sort: { completed: -1 } },
        { $limit: 5 },
      ]),
    ]);

  const roleCount = (role: string) => userRows.find((r) => r._id === role)?.count ?? 0;
  const topDocs = await Doctor.find({ _id: { $in: topRows.map((r) => r._id) } }).populate("user", "name").populate("specialty", "name").lean();
  const topDoctors = topRows.map((r) => {
    const d: any = topDocs.find((x) => String(x._id) === String(r._id));
    return { doctor: String(r._id), name: d?.user?.name, specialty: d?.specialty?.name, completedAppointments: r.completed };
  });

  return {
    users: {
      total: userRows.reduce((a, r) => a + r.count, 0),
      patients: roleCount("patient"),
      doctors: roleCount("doctor"),
      admins: roleCount("admin"),
      inactive: inactiveUsers,
    },
    doctors: { total: doctorsTotal, approved: doctorsTotal - doctorsPending, pendingApproval: doctorsPending },
    specialties: { active: specialties },
    appointments: { ...appts, today: todayCount, upcoming, last7Days: trend },
    payments: { byStatus: payments, revenue: payments.paid.amount, refunded: payments.refunded.amount },
    topDoctors,
  };
}

export async function doctorDashboard(userId: string) {
  const doctor = await Doctor.findOne({ user: userId }).select("_id ratingAvg ratingCount").lean();
  if (!doctor) return null;
  const match = { doctor: oid(doctor._id) };
  const today = clinicNow().date;

  const [appts, todayCount, upcoming, trend, patientIds, apptIds, nextAppointments] = await Promise.all([
    appointmentCounts(match),
    Appointment.countDocuments({ doctor: doctor._id, date: today, status: { $ne: "cancelled" } }),
    Appointment.countDocuments(upcomingFilter({ doctor: doctor._id })),
    last7Days(match),
    Appointment.find({ doctor: doctor._id }).distinct("patient"),
    Appointment.find({ doctor: doctor._id }).distinct("_id"),
    findAppointmentViews(upcomingFilter({ doctor: doctor._id }), { date: 1, startTime: 1 }, 5),
  ]);
  const payments = await paymentTotals({ appointment: { $in: apptIds } });

  return {
    appointments: { ...appts, pendingRequests: appts.byStatus.pending, today: todayCount, upcoming, last7Days: trend },
    patients: { unique: patientIds.length },
    earnings: { received: payments.paid.amount, outstanding: payments.pending.amount, refunded: payments.refunded.amount, currency: "PKR" },
    rating: { average: doctor.ratingAvg, count: doctor.ratingCount },
    nextAppointments,
  };
}

export async function patientDashboard(userId: string) {
  const match = { patient: oid(userId) };
  const [appts, upcoming, next, payments, reviewsGiven, completedIds] = await Promise.all([
    appointmentCounts(match),
    Appointment.countDocuments(upcomingFilter({ patient: userId })),
    findAppointmentViews(upcomingFilter({ patient: userId }), { date: 1, startTime: 1 }, 1),
    paymentTotals({ patient: oid(userId) }),
    Review.countDocuments({ patient: userId }),
    Appointment.find({ patient: userId, status: "completed" }).distinct("_id"),
  ]);
  const reviewedCompleted = completedIds.length ? await Review.countDocuments({ appointment: { $in: completedIds } }) : 0;

  return {
    appointments: { ...appts, upcoming },
    nextAppointment: next[0] ?? null,
    payments: {
      totalSpent: payments.paid.amount,
      refunded: payments.refunded.amount,
      pendingCount: payments.pending.count,
      pendingAmount: payments.pending.amount,
      currency: "PKR",
    },
    reviews: { given: reviewsGiven, awaitingReview: completedIds.length - reviewedCompleted },
  };
}
