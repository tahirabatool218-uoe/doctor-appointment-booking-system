import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { sendData } from "../utils/response";
import { adminDashboard, doctorDashboard, patientDashboard } from "../services/dashboard.service";

export const getAdminDashboard = asyncHandler(async (_req, res) => {
  sendData(res, await adminDashboard());
});

export const getDoctorDashboard = asyncHandler(async (req, res) => {
  const stats = await doctorDashboard(req.user!.id);
  if (!stats) throw new AppError(404, "NOT_FOUND", "Doctor profile not found");
  sendData(res, stats);
});

export const getPatientDashboard = asyncHandler(async (req, res) => {
  sendData(res, await patientDashboard(req.user!.id));
});
