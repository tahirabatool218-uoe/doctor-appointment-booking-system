import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { paginate } from "../utils/pagination";
import { sendData, sendList } from "../utils/response";
import { User } from "../models/User";
import { toUserDTO, toUserDTOs } from "../services/serializers";
import type { ListUsersQuery } from "../validators/user.validators";

export const listUsers = asyncHandler(async (req, res) => {
  const q = req.query as unknown as ListUsersQuery;
  const { page, limit, skip } = paginate(q);
  const filter = q.role ? { role: q.role } : {};
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  sendList(res, await toUserDTOs(users), { page, limit, total });
});

export const updateMe = asyncHandler(async (req, res) => {
  const { name, phone } = req.body as { name?: string; phone?: string };
  const set: Record<string, unknown> = {};
  if (name !== undefined) set.name = name;
  if (phone !== undefined) set.phone = phone;
  const user = await User.findByIdAndUpdate(req.user!.id, { $set: set }, { new: true, runValidators: true }).lean();
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
  sendData(res, await toUserDTO(user));
});

export const adminUpdateUser = asyncHandler(async (req, res) => {
  const { isActive, role } = req.body as { isActive?: boolean; role?: "admin" | "patient" };
  const id = req.params.id;

  if (id === req.user!.id) throw new AppError(400, "INVALID_OPERATION", "You cannot change your own role or status");
  const target = await User.findById(id);
  if (!target) throw new AppError(404, "NOT_FOUND", "User not found");
  if (role !== undefined && target.role === "doctor") {
    throw new AppError(400, "INVALID_OPERATION", "Doctor accounts are managed through the doctor endpoints");
  }

  if (isActive !== undefined) target.isActive = isActive;
  if (role !== undefined) target.role = role;
  await target.save();
  sendData(res, await toUserDTO(target));
});
