import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/common.validators";
import { createReviewSchema } from "../validators/review.validators";
import { createReview, deleteReview } from "../controllers/review.controller";

const r = Router();
r.use(authenticate);
r.post("/", authorize("patient"), validate(createReviewSchema), createReview);
r.delete("/:id", authorize("admin"), validate(idParam, "params"), deleteReview);
export default r;
