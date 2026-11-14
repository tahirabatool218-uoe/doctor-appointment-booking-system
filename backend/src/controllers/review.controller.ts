import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { sendData, sendNoContent } from "../utils/response";
import { sameId } from "../utils/helpers";
import { Appointment } from "../models/Appointment";
import { Review } from "../models/Review";
import { recalcDoctorRating } from "../services/doctor.service";
import { toReviewDTO } from "../services/serializers";
import type { CreateReviewInput } from "../validators/review.validators";

export const createReview = asyncHandler(async (req, res) => {
  const { appointment, rating, comment } = req.body as CreateReviewInput;

  const appt = await Appointment.findById(appointment).select("patient doctor status").lean();
  if (!appt) throw new AppError(404, "NOT_FOUND", "Appointment not found");
  if (!sameId(appt.patient, req.user!.id)) throw new AppError(403, "FORBIDDEN", "You can only review your own appointments");
  if (appt.status !== "completed") throw new AppError(400, "INVALID_STATE", "Only completed appointments can be reviewed");

  let review;
  try {
    review = await Review.create({ appointment: appt._id, patient: appt.patient, doctor: appt.doctor, rating, comment });
  } catch (err: any) {
    if (err?.code === 11000) throw new AppError(409, "CONFLICT", "This appointment has already been reviewed");
    throw err;
  }
  await recalcDoctorRating(appt.doctor);

  const populated = await Review.findById(review._id).populate("patient", "name").lean();
  sendData(res, toReviewDTO(populated), 201);
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id).lean();
  if (!review) throw new AppError(404, "NOT_FOUND", "Review not found");
  await recalcDoctorRating(review.doctor);
  sendNoContent(res);
});
