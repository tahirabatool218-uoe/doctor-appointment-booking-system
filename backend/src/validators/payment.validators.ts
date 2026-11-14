import { z } from "zod";
import { objectId } from "./common.validators";
import { paginationSchema } from "../utils/pagination";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "../models/Payment";

export const appointmentIdParam = z.object({ appointmentId: objectId });
export const paySchema = z.object({ method: z.enum(PAYMENT_METHODS), transactionRef: z.string().trim().max(100).optional() });
export const createPaymentSchema = z.object({ appointment: objectId });
export const updatePaymentStatusSchema = z.object({
  status: z.enum(["pending", "paid", "failed", "refunded"]),
  method: z.enum(PAYMENT_METHODS).optional(),
  transactionRef: z.string().trim().max(100).optional(),
});
export const listPaymentsQuery = paginationSchema.extend({ status: z.enum(PAYMENT_STATUSES).optional() });

export type PayInput = z.infer<typeof paySchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuery>;
