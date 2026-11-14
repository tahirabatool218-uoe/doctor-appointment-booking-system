import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { sendData, sendNoContent } from "../utils/response";
import { slugify } from "../utils/helpers";
import { Specialty } from "../models/Specialty";
import { Doctor } from "../models/Doctor";
import { specialtyDTO } from "../services/serializers";

export const listSpecialties = asyncHandler(async (req, res) => {
  // Admins also see deactivated specialties so they can manage them.
  const filter = req.user?.role === "admin" ? {} : { isActive: true };
  const items = await Specialty.find(filter).sort({ name: 1 }).lean();
  sendData(res, items.map(specialtyDTO));
});

export const createSpecialty = asyncHandler(async (req, res) => {
  const { name, description } = req.body as { name: string; description?: string };
  const slug = slugify(name);
  if (!slug) throw new AppError(400, "VALIDATION_ERROR", "Name must contain letters or numbers");
  if (await Specialty.exists({ $or: [{ name }, { slug }] })) throw new AppError(409, "CONFLICT", "Specialty already exists");
  const created = await Specialty.create({ name, slug, description });
  sendData(res, specialtyDTO(created), 201);
});

export const updateSpecialty = asyncHandler(async (req, res) => {
  const { name, description, isActive } = req.body as { name?: string; description?: string; isActive?: boolean };
  const spec = await Specialty.findById(req.params.id);
  if (!spec) throw new AppError(404, "NOT_FOUND", "Specialty not found");

  if (name !== undefined && name !== spec.name) {
    const slug = slugify(name);
    if (!slug) throw new AppError(400, "VALIDATION_ERROR", "Name must contain letters or numbers");
    if (await Specialty.exists({ _id: { $ne: spec._id }, $or: [{ name }, { slug }] })) {
      throw new AppError(409, "CONFLICT", "Specialty already exists");
    }
    spec.name = name;
    spec.slug = slug;
  }
  if (description !== undefined) spec.description = description;
  if (isActive !== undefined) spec.isActive = isActive;
  await spec.save();
  sendData(res, specialtyDTO(spec));
});

export const deleteSpecialty = asyncHandler(async (req, res) => {
  const spec = await Specialty.findById(req.params.id).select("_id");
  if (!spec) throw new AppError(404, "NOT_FOUND", "Specialty not found");
  if (await Doctor.exists({ specialty: spec._id })) {
    throw new AppError(409, "CONFLICT", "Cannot delete a specialty that is assigned to doctors");
  }
  await spec.deleteOne();
  sendNoContent(res);
});
