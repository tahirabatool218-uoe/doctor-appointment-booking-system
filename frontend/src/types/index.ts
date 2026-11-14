export type Role = "admin" | "doctor" | "patient";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "card" | "cash" | "online";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  isActive: boolean;
  /** Present for doctor accounts (see README: contract extension). */
  doctorId?: string;
  createdAt: string;
}
export type UserSummary = Pick<User, "_id" | "name" | "email" | "phone">;

export interface Specialty {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
}

export interface Availability {
  dayOfWeek: number; // 0 = Sunday
  startTime: string; // HH:mm
  endTime: string;
}

export interface Doctor {
  _id: string;
  user: UserSummary;
  specialty: Specialty;
  bio?: string;
  qualifications: string[];
  experienceYears: number;
  consultationFee: number;
  slotDurationMinutes: number;
  availability: Availability[];
  isApproved: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
}

export interface Payment {
  _id: string;
  appointment: string;
  patient: string;
  amount: number;
  currency: string;
  method?: PaymentMethod;
  status: PaymentStatus;
  transactionRef?: string;
  paidAt?: string;
  createdAt: string;
}

export interface Review {
  _id: string;
  appointment: string;
  patient: Pick<User, "_id" | "name">;
  doctor: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Appointment {
  _id: string;
  patient: UserSummary;
  doctor: Doctor;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  cancelledBy?: string;
  payment?: Payment;
  review?: Review;
  createdAt: string;
}

export interface Slot { startTime: string; endTime: string; available: boolean }
export interface SlotsResponse { date: string; slots: Slot[] }

export interface PageMeta { page: number; limit: number; total: number }
export interface ApiList<T> { data: T[]; meta: PageMeta }
export interface ApiErrorBody { error: { code: string; message: string; details?: unknown } }

// ---- request payloads ----
export interface RegisterPayload { name: string; email: string; password: string; phone?: string }
export interface LoginPayload { email: string; password: string }
export interface AuthResponse { user: User; token: string }
export interface CreateDoctorPayload {
  name: string; email: string; password: string; specialty: string; consultationFee: number;
  bio?: string; qualifications?: string[]; experienceYears?: number; availability?: Availability[]; isApproved?: boolean;
}
export type UpdateDoctorPayload = Partial<{
  bio: string; qualifications: string[]; experienceYears: number; consultationFee: number;
  slotDurationMinutes: number; availability: Availability[]; specialty: string;
}>;
export interface CreateAppointmentPayload { doctor: string; date: string; startTime: string; reason?: string }
export interface UpdateStatusPayload { status: Exclude<AppointmentStatus, "pending">; notes?: string }
export interface PayPayload { method: PaymentMethod; transactionRef?: string }
export interface CreateReviewPayload { appointment: string; rating: number; comment?: string }
