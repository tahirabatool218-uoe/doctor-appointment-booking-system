import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { getAdminDashboard, getDoctorDashboard, getPatientDashboard } from "../controllers/dashboard.controller";

const r = Router();
r.use(authenticate);
r.get("/admin", authorize("admin"), getAdminDashboard);
r.get("/doctor", authorize("doctor"), getDoctorDashboard);
r.get("/patient", authorize("patient"), getPatientDashboard);
export default r;
