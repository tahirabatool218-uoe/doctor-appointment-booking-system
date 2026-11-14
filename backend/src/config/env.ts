import "dotenv/config";
import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGODB_URI: z.string().min(1),
    JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
    JWT_EXPIRES_IN: z.string().default("7d"),
    CLIENT_URL: z.string().default("http://localhost:3000"),
    TZ_OFFSET_MINUTES: z.coerce.number().int().min(-720).max(840).default(300),
    // Patients can cancel only if the appointment starts at least this many hours from now.
    CANCELLATION_WINDOW_HOURS: z.coerce.number().min(0).max(168).default(2),
    // Seed-only (optional at runtime)
    SEED_ADMIN_NAME: z.string().optional(),
    SEED_ADMIN_EMAIL: z.string().optional(),
    SEED_ADMIN_PASSWORD: z.string().optional(),
    SEED_DOCTOR_PASSWORD: z.string().optional(),
    // "true"/"false"; default: true outside production, false in production
    SEED_SAMPLE_DOCTORS: z.enum(["true", "false"]).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.NODE_ENV === "production" && (v.JWT_SECRET.startsWith("change-me") || v.JWT_SECRET.length < 32)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_SECRET"],
        message: "In production JWT_SECRET must be a real random value of at least 32 characters",
      });
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const i of parsed.error.issues) console.error(`  - ${i.path.join(".")}: ${i.message}`);
  process.exit(1);
}

export const env = parsed.data;
