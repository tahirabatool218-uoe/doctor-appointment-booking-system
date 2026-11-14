import { Schema, model, Types } from "mongoose";

export const PAYMENT_METHODS = ["card", "cash", "online"] as const;
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface IPayment {
  _id: Types.ObjectId;
  appointment: Types.ObjectId;
  patient: Types.ObjectId;
  amount: number;
  currency: string;
  method?: PaymentMethod;
  status: PaymentStatus;
  transactionRef?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment", required: true, unique: true },
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "PKR" },
    method: { type: String, enum: PAYMENT_METHODS },
    status: { type: String, enum: PAYMENT_STATUSES, default: "pending" },
    transactionRef: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const Payment = model<IPayment>("Payment", paymentSchema);
