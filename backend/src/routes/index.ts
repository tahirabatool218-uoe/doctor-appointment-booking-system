
import { Router } from "express";
import { connectDB } from "../config/db";

import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import specialtyRoutes from "./specialty.routes";
import doctorRoutes from "./doctor.routes";
import appointmentRoutes from "./appointment.routes";
import paymentRoutes from "./payment.routes";
import reviewRoutes from "./review.routes";
import dashboardRoutes from "./dashboard.routes";

const router = Router();

// Health endpoint does not require MongoDB.
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Ensure MongoDB is connected before database-dependent routes.
router.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/specialties", specialtyRoutes);
router.use("/doctors", doctorRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/payments", paymentRoutes);
router.use("/reviews", reviewRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
