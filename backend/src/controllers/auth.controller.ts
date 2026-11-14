import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { sendData } from "../utils/response";
import { comparePassword, getDummyHash, hashPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { User } from "../models/User";
import { toUserDTO } from "../services/serializers";
import type { LoginInput, RegisterInput } from "../validators/auth.validators";

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body as RegisterInput;

  if (await User.exists({ email })) throw new AppError(409, "EMAIL_EXISTS", "Email is already registered");

  const passwordHash = await hashPassword(password);
  let user;
  try {
    // Role is hard-coded: public registration can only ever create patients.
    user = await User.create({ name, email, passwordHash, phone, role: "patient" });
  } catch (err: any) {
    if (err?.code === 11000) throw new AppError(409, "EMAIL_EXISTS", "Email is already registered");
    throw err;
  }

  sendData(res, { user: await toUserDTO(user), token: signToken(String(user._id), user.role) }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body as LoginInput;

  const user = await User.findOne({ email }).select("+passwordHash");
  // Always run one bcrypt comparison so response time doesn't reveal whether the email exists.
  const valid = await comparePassword(password, user ? user.passwordHash : await getDummyHash());
  if (!user || !valid) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  if (!user.isActive) throw new AppError(401, "ACCOUNT_DISABLED", "This account has been deactivated");

  sendData(res, { user: await toUserDTO(user), token: signToken(String(user._id), user.role) });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user!.id).lean();
  if (!user) throw new AppError(401, "UNAUTHORIZED", "Invalid account");
  sendData(res, { user: await toUserDTO(user) });
});
