import { Schema, model, Types } from "mongoose";

export const ROLES = ["admin", "doctor", "patient"] as const;
export type Role = (typeof ROLES)[number];

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select:false -> never loaded unless explicitly requested with .select("+passwordHash")
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "patient" },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    // Defense in depth: even if a document is serialized directly, the hash is stripped.
    toJSON: {
      transform: (_doc: unknown, ret: any) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const User = model<IUser>("User", userSchema);
