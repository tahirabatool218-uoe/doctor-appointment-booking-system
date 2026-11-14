import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/common.validators";
import { adminUpdateUserSchema, listUsersQuery, updateMeSchema } from "../validators/user.validators";
import { adminUpdateUser, listUsers, updateMe } from "../controllers/user.controller";

const r = Router();
r.use(authenticate);
r.get("/", authorize("admin"), validate(listUsersQuery, "query"), listUsers);
r.patch("/me", validate(updateMeSchema), updateMe); // must be declared before "/:id"
r.patch("/:id", authorize("admin"), validate(idParam, "params"), validate(adminUpdateUserSchema), adminUpdateUser);
export default r;
