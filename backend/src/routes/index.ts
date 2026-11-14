import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import specialtyRoutes from "./specialty.routes";
import doctorRoutes from "./doctor.routes";
import appointmentRoutes from "./appointment.routes";
import paymentRoutes from "./payment.routes";
import reviewRoutes from "./review.routes";
import dashboardRoutes from "./dashboard.routes";

const router = Router();

router.get("/health", (_req, res) => res.json({ status: "ok" }));

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/specialties", specialtyRoutes);
router.use("/doctors", doctorRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/payments", paymentRoutes);
router.use("/reviews", reviewRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
