import { Router } from "express";
import { authenticate, authorize, optionalAuthenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/common.validators";
import {
  approveDoctorSchema,
  createDoctorSchema,
  listDoctorsQuery,
  setAvailabilitySchema,
  slotsQuery,
  updateDoctorSchema,
} from "../validators/doctor.validators";
import { listReviewsQuery } from "../validators/review.validators";
import {
  approveDoctor,
  createDoctor,
  getAvailability,
  getDoctor,
  getMyDoctor,
  getDoctorSlots,
  listDoctorReviews,
  listDoctors,
  setAvailability,
  updateDoctor,
} from "../controllers/doctor.controller";

const r = Router();
r.get("/", optionalAuthenticate, validate(listDoctorsQuery, "query"), listDoctors);
r.post("/", authenticate, authorize("admin"), validate(createDoctorSchema), createDoctor);
r.get("/me", authenticate, authorize("doctor"), getMyDoctor); // must be declared before "/:id"
r.get("/:id", optionalAuthenticate, validate(idParam, "params"), getDoctor);
r.patch("/:id", authenticate, authorize("admin", "doctor"), validate(idParam, "params"), validate(updateDoctorSchema), updateDoctor);
r.patch("/:id/approve", authenticate, authorize("admin"), validate(idParam, "params"), validate(approveDoctorSchema), approveDoctor);
r.get("/:id/availability", optionalAuthenticate, validate(idParam, "params"), getAvailability);
r.put("/:id/availability", authenticate, authorize("admin", "doctor"), validate(idParam, "params"), validate(setAvailabilitySchema), setAvailability);
r.get("/:id/slots", validate(idParam, "params"), validate(slotsQuery, "query"), getDoctorSlots);
r.get("/:id/reviews", validate(idParam, "params"), validate(listReviewsQuery, "query"), listDoctorReviews);
export default r;
