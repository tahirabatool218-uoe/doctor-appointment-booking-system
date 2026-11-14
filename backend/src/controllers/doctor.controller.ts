import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { paginate } from "../utils/pagination";
import { sendData, sendList } from "../utils/response";
import { escapeRegex, isObjectId, sameId } from "../utils/helpers";
import { hashPassword } from "../utils/password";
import { Doctor } from "../models/Doctor";
import { Specialty } from "../models/Specialty";
import { User } from "../models/User";
import { Review } from "../models/Review";
import { DOCTOR_POPULATE, findAvailabilityConflicts, findDoctorPopulated, getSlotsForDate } from "../services/doctor.service";
import { dayOfWeek } from "../utils/time";
import { canSeeDoctorContact, toDoctorDTO, toReviewDTO } from "../services/serializers";
import type { CreateDoctorInput, ListDoctorsQuery, SetAvailabilityInput, UpdateDoctorInput } from "../validators/doctor.validators";


async function assertNoBookingConflicts(doctor: { _id: unknown }, availability: any[], slotMinutes: number) {
  const conflicts = await findAvailabilityConflicts(doctor._id, availability, slotMinutes);
  if (conflicts.length) {
    throw new AppError(409, "AVAILABILITY_CONFLICT", "This schedule would leave existing appointments outside working hours. Cancel or reschedule them first.", conflicts);
  }
}

const isListed = (d: any) => d.isApproved && d.user?.isActive !== false;

async function requireActiveSpecialty(id: string) {
  const spec = await Specialty.findById(id).select("isActive").lean();
  if (!spec) throw new AppError(400, "VALIDATION_ERROR", "Specialty does not exist");
  if (!spec.isActive) throw new AppError(400, "VALIDATION_ERROR", "Specialty is not active");
}

export const listDoctors = asyncHandler(async (req, res) => {
  const q = req.query as unknown as ListDoctorsQuery;
  const { page, limit, skip } = paginate(q);
  const includeAll = req.user?.role === "admin" && q.includeUnapproved;

  const userFilter: Record<string, unknown> = { role: "doctor" };
  if (!includeAll) userFilter.isActive = true;
  if (q.q) userFilter.name = { $regex: escapeRegex(q.q), $options: "i" };
  const userIds = await User.find(userFilter).distinct("_id");

  const filter: Record<string, unknown> = { user: { $in: userIds } };
  if (!includeAll) filter.isApproved = true;
  if (q.specialty) {
    const spec = await Specialty.findOne(isObjectId(q.specialty) ? { _id: q.specialty } : { slug: q.specialty.toLowerCase() })
      .select("_id")
      .lean();
    if (!spec) return sendList(res, [], { page, limit, total: 0 });
    filter.specialty = spec._id;
  }
  if (q.minFee !== undefined || q.maxFee !== undefined) {
    filter.consultationFee = {
      ...(q.minFee !== undefined ? { $gte: q.minFee } : {}),
      ...(q.maxFee !== undefined ? { $lte: q.maxFee } : {}),
    };
  }
  if (q.minRating !== undefined) filter.ratingAvg = { $gte: q.minRating };
  if (q.minExperience !== undefined) filter.experienceYears = { $gte: q.minExperience };
  if (q.availableOn) filter["availability.dayOfWeek"] = dayOfWeek(q.availableOn);

  const SORTS: Record<ListDoctorsQuery["sort"], Record<string, 1 | -1>> = {
    rating: { ratingAvg: -1, ratingCount: -1, _id: 1 },
    fee_asc: { consultationFee: 1, _id: 1 },
    fee_desc: { consultationFee: -1, _id: 1 },
    experience: { experienceYears: -1, _id: 1 },
    newest: { createdAt: -1, _id: 1 },
  };

  const [docs, total] = await Promise.all([
    Doctor.find(filter).populate(DOCTOR_POPULATE).sort(SORTS[q.sort]).skip(skip).limit(limit).lean(),
    Doctor.countDocuments(filter),
  ]);
  sendList(res, docs.map((d) => toDoctorDTO(d, req.user?.role === "admin")), { page, limit, total });
});

export const getDoctor = asyncHandler(async (req, res) => {
  const d = await findDoctorPopulated(req.params.id);
  const privileged = d && canSeeDoctorContact(d, req.user);
  if (!d || (!isListed(d) && !privileged)) throw new AppError(404, "NOT_FOUND", "Doctor not found");
  sendData(res, toDoctorDTO(d, !!privileged));
});

export const createDoctor = asyncHandler(async (req, res) => {
  const b = req.body as CreateDoctorInput;
  await requireActiveSpecialty(b.specialty);
  if (await User.exists({ email: b.email })) throw new AppError(409, "EMAIL_EXISTS", "Email is already registered");

  const passwordHash = await hashPassword(b.password);
  let user;
  try {
    user = await User.create({ name: b.name, email: b.email, passwordHash, role: "doctor" });
  } catch (err: any) {
    if (err?.code === 11000) throw new AppError(409, "EMAIL_EXISTS", "Email is already registered");
    throw err;
  }

  let doctor;
  try {
    doctor = await Doctor.create({
      user: user._id,
      specialty: b.specialty,
      consultationFee: b.consultationFee,
      bio: b.bio,
      qualifications: b.qualifications ?? [],
      experienceYears: b.experienceYears ?? 0,
      slotDurationMinutes: b.slotDurationMinutes ?? 30,
      availability: b.availability ?? [],
      // The admin creating the account is the approver, so default to approved.
      isApproved: b.isApproved ?? true,
    });
  } catch (err) {
    await User.deleteOne({ _id: user._id }); // no orphan doctor-user if profile creation fails
    throw err;
  }

  const full = await findDoctorPopulated(String(doctor._id));
  sendData(res, toDoctorDTO(full, true), 201);
});

export const updateDoctor = asyncHandler(async (req, res) => {
  const b = req.body as UpdateDoctorInput;
  const existing = await Doctor.findById(req.params.id).select("user availability slotDurationMinutes").lean();
  if (!existing) throw new AppError(404, "NOT_FOUND", "Doctor not found");
  if (req.user!.role !== "admin" && !sameId(existing.user, req.user!.id)) {
    throw new AppError(403, "FORBIDDEN", "You can only edit your own profile");
  }
  if (b.specialty) await requireActiveSpecialty(b.specialty);
  if (b.availability !== undefined || b.slotDurationMinutes !== undefined) {
    await assertNoBookingConflicts(existing, b.availability ?? existing.availability, b.slotDurationMinutes ?? existing.slotDurationMinutes);
  }

  const set: Record<string, unknown> = {};
  for (const key of ["bio", "qualifications", "experienceYears", "consultationFee", "slotDurationMinutes", "availability", "specialty"] as const) {
    if (b[key] !== undefined) set[key] = b[key];
  }
  await Doctor.updateOne({ _id: existing._id }, { $set: set }, { runValidators: true });

  const full = await findDoctorPopulated(String(existing._id));
  sendData(res, toDoctorDTO(full, true));
});

export const approveDoctor = asyncHandler(async (req, res) => {
  const { isApproved } = req.body as { isApproved: boolean };
  const updated = await Doctor.findByIdAndUpdate(req.params.id, { $set: { isApproved } }).select("_id").lean();
  if (!updated) throw new AppError(404, "NOT_FOUND", "Doctor not found");
  const full = await findDoctorPopulated(String(updated._id));
  sendData(res, toDoctorDTO(full, true));
});

export const getDoctorSlots = asyncHandler(async (req, res) => {
  const { date } = req.query as unknown as { date: string };
  const d = await findDoctorPopulated(req.params.id);
  if (!d || !isListed(d)) throw new AppError(404, "NOT_FOUND", "Doctor not found");
  sendData(res, { date, slots: await getSlotsForDate(d, date) });
});

export const listDoctorReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query as unknown as { page: number; limit: number });
  if (!(await Doctor.exists({ _id: req.params.id }))) throw new AppError(404, "NOT_FOUND", "Doctor not found");
  const filter = { doctor: req.params.id };
  const [items, total] = await Promise.all([
    Review.find(filter).populate("patient", "name").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Review.countDocuments(filter),
  ]);
  sendList(res, items.map(toReviewDTO), { page, limit, total });
});

/** The signed-in doctor's own profile (works even before approval). */
export const getMyDoctor = asyncHandler(async (req, res) => {
  const mine = await Doctor.findOne({ user: req.user!.id }).select("_id").lean();
  if (!mine) throw new AppError(404, "NOT_FOUND", "Doctor profile not found");
  const full = await findDoctorPopulated(String(mine._id));
  sendData(res, toDoctorDTO(full, true));
});

export const getAvailability = asyncHandler(async (req, res) => {
  const d = await findDoctorPopulated(req.params.id);
  const privileged = d && canSeeDoctorContact(d, req.user);
  if (!d || (!isListed(d) && !privileged)) throw new AppError(404, "NOT_FOUND", "Doctor not found");
  sendData(res, { slotDurationMinutes: d.slotDurationMinutes, availability: toDoctorDTO(d, false).availability });
});

export const setAvailability = asyncHandler(async (req, res) => {
  const { availability, slotDurationMinutes } = req.body as SetAvailabilityInput;
  const existing = await Doctor.findById(req.params.id).select("user slotDurationMinutes").lean();
  if (!existing) throw new AppError(404, "NOT_FOUND", "Doctor not found");
  if (req.user!.role !== "admin" && !sameId(existing.user, req.user!.id)) {
    throw new AppError(403, "FORBIDDEN", "You can only edit your own availability");
  }
  const slotMinutes = slotDurationMinutes ?? existing.slotDurationMinutes;
  await assertNoBookingConflicts(existing, availability, slotMinutes);

  await Doctor.updateOne({ _id: existing._id }, { $set: { availability, slotDurationMinutes: slotMinutes } }, { runValidators: true });
  sendData(res, { slotDurationMinutes: slotMinutes, availability });
});
