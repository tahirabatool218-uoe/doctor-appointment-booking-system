import { Router } from "express";
import { authenticate, authorize, optionalAuthenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/common.validators";
import { createSpecialtySchema, updateSpecialtySchema } from "../validators/specialty.validators";
import { createSpecialty, deleteSpecialty, listSpecialties, updateSpecialty } from "../controllers/specialty.controller";

const r = Router();
r.get("/", optionalAuthenticate, listSpecialties);
r.post("/", authenticate, authorize("admin"), validate(createSpecialtySchema), createSpecialty);
r.patch("/:id", authenticate, authorize("admin"), validate(idParam, "params"), validate(updateSpecialtySchema), updateSpecialty);
r.delete("/:id", authenticate, authorize("admin"), validate(idParam, "params"), deleteSpecialty);
export default r;
