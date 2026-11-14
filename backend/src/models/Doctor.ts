import { Schema, model, Types } from "mongoose";

export interface IAvailability {
  dayOfWeek: number; // 0 = Sunday
  startTime: string; // HH:mm
  endTime: string;
}

export interface IDoctor {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  specialty: Types.ObjectId;
  bio?: string;
  qualifications: string[];
  experienceYears: number;
  consultationFee: number;
  slotDurationMinutes: number;
  availability: IAvailability[];
  isApproved: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const availabilitySchema = new Schema<IAvailability>(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const doctorSchema = new Schema<IDoctor>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    specialty: { type: Schema.Types.ObjectId, ref: "Specialty", required: true, index: true },
    bio: { type: String },
    qualifications: { type: [String], default: [] },
    experienceYears: { type: Number, default: 0, min: 0 },
    consultationFee: { type: Number, required: true, min: 0 },
    slotDurationMinutes: { type: Number, default: 30, min: 10 },
    availability: { type: [availabilitySchema], default: [] },
    isApproved: { type: Boolean, default: false },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Doctor = model<IDoctor>("Doctor", doctorSchema);
