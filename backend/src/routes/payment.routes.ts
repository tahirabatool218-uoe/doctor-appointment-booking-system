import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/common.validators";
import { appointmentIdParam, createPaymentSchema, listPaymentsQuery, paySchema, updatePaymentStatusSchema } from "../validators/payment.validators";
import { createPayment, getPayment, listPayments, payForAppointment, refundPayment, updatePaymentStatus } from "../controllers/payment.controller";

const r = Router();
r.use(authenticate);
r.post("/:appointmentId/pay", authorize("patient"), validate(appointmentIdParam, "params"), validate(paySchema), payForAppointment);
r.post("/", authorize("patient", "admin"), validate(createPaymentSchema), createPayment);
r.get("/", validate(listPaymentsQuery, "query"), listPayments);
r.get("/:id", validate(idParam, "params"), getPayment);
r.patch("/:id/refund", authorize("admin"), validate(idParam, "params"), refundPayment);
r.patch("/:id/status", authorize("admin", "doctor"), validate(idParam, "params"), validate(updatePaymentStatusSchema), updatePaymentStatus);
export default r;
