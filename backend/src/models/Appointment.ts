import { Schema, model, Types } from "mongoose";

export const APPOINTMENT_STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export interface IAppointment {
  _id: Types.ObjectId;
  patient: Types.ObjectId;
  doctor: Types.ObjectId;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  cancelledBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: "pending" },
    reason: { type: String },
    notes: { type: String },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Prevent double booking of an active slot (partial $in filter requires MongoDB 6.0+)
appointmentSchema.index(
  { doctor: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["pending", "confirmed"] } } }
);

export const Appointment = model<IAppointment>("Appointment", appointmentSchema);
