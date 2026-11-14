import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/common.validators";
import { createAppointmentSchema, listAppointmentsQuery, respondSchema, updateStatusSchema } from "../validators/appointment.validators";
import { createAppointment, getAppointment, listAppointments, respondToAppointment, updateAppointmentStatus } from "../controllers/appointment.controller";

const r = Router();
r.use(authenticate);
r.post("/", authorize("patient"), validate(createAppointmentSchema), createAppointment);
r.get("/", validate(listAppointmentsQuery, "query"), listAppointments);
r.get("/:id", validate(idParam, "params"), getAppointment);
r.patch("/:id/status", validate(idParam, "params"), validate(updateStatusSchema), updateAppointmentStatus);
r.patch("/:id/respond", authorize("doctor", "admin"), validate(idParam, "params"), validate(respondSchema), respondToAppointment);
export default r;
