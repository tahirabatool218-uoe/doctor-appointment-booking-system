import { env } from "../config/env";
import { connectDB, disconnectDB } from "../config/db";
import { hashPassword } from "../utils/password";
import { slugify } from "../utils/helpers";
import { User, Specialty, Doctor } from "../models";

/**
 * Idempotent: safe to run repeatedly. Existing records are never overwritten (so a changed admin
 * password is not reset). Usage: `npm run seed`
 */

const isProd = env.NODE_ENV === "production";

function requireInProd(name: string, value: string | undefined, devDefault: string): string {
  if (value) return value;
  if (isProd) throw new Error(`${name} must be set when seeding in production`);
  return devDefault;
}

const weekdays = (startTime: string, endTime: string, days = [1, 2, 3, 4, 5]) =>
  days.map((dayOfWeek) => ({ dayOfWeek, startTime, endTime }));

const SPECIALTIES = [
  ["General Medicine", "Primary care and general health concerns"],
  ["Cardiology", "Heart and cardiovascular conditions"],
  ["Dermatology", "Skin, hair and nail conditions"],
  ["Pediatrics", "Healthcare for infants, children and adolescents"],
  ["Orthopedics", "Bones, joints and musculoskeletal injuries"],
  ["Gynecology", "Women's reproductive health"],
  ["Neurology", "Brain, spine and nervous system disorders"],
  ["ENT", "Ear, nose and throat conditions"],
] as const;

const DOCTORS = [
  { name: "Dr. Ayesha Khan", email: "ayesha.khan@clinic.example", specialty: "Cardiology", fee: 3000, years: 12,
    qualifications: ["MBBS", "FCPS (Cardiology)"], bio: "Consultant cardiologist focused on preventive heart care.",
    availability: weekdays("09:00", "13:00") },
  { name: "Dr. Bilal Ahmed", email: "bilal.ahmed@clinic.example", specialty: "General Medicine", fee: 1500, years: 8,
    qualifications: ["MBBS", "MRCP"], bio: "General physician treating adults and families.",
    availability: [...weekdays("09:00", "12:00"), ...weekdays("16:00", "19:00", [1, 3, 5])] },
  { name: "Dr. Sana Malik", email: "sana.malik@clinic.example", specialty: "Dermatology", fee: 2500, years: 9,
    qualifications: ["MBBS", "FCPS (Dermatology)"], bio: "Treats acne, eczema and hair loss.",
    availability: weekdays("10:00", "14:00", [1, 2, 4]) },
  { name: "Dr. Usman Raza", email: "usman.raza@clinic.example", specialty: "Pediatrics", fee: 2000, years: 11,
    qualifications: ["MBBS", "DCH", "FCPS (Pediatrics)"], bio: "Child health, vaccinations and growth monitoring.",
    availability: weekdays("09:30", "13:30", [1, 2, 3, 4, 6]) },
  { name: "Dr. Hina Farooq", email: "hina.farooq@clinic.example", specialty: "Gynecology", fee: 2800, years: 14,
    qualifications: ["MBBS", "FCPS (Gynecology)"], bio: "Obstetric and gynecological care.",
    availability: weekdays("11:00", "15:00", [2, 3, 5]) },
  { name: "Dr. Imran Siddiqui", email: "imran.siddiqui@clinic.example", specialty: "Orthopedics", fee: 3200, years: 15,
    qualifications: ["MBBS", "FCPS (Orthopedics)"], bio: "Joint replacement and sports injuries.",
    availability: weekdays("14:00", "18:00", [1, 3, 4]) },
];

async function main() {
  const adminEmail = requireInProd("SEED_ADMIN_EMAIL", env.SEED_ADMIN_EMAIL, "admin@clinic.example").toLowerCase();
  const adminPassword = requireInProd("SEED_ADMIN_PASSWORD", env.SEED_ADMIN_PASSWORD, "Admin@12345");
  const withSampleDoctors = (env.SEED_SAMPLE_DOCTORS ?? (isProd ? "false" : "true")) === "true";
  const doctorPassword = withSampleDoctors
    ? requireInProd("SEED_DOCTOR_PASSWORD", env.SEED_DOCTOR_PASSWORD, "Doctor@12345")
    : "";

  await connectDB();

  // Specialties
  const specialtyIds = new Map<string, unknown>();
  for (const [name, description] of SPECIALTIES) {
    const slug = slugify(name);
    const spec = await Specialty.findOneAndUpdate(
      { slug },
      { $setOnInsert: { name, slug, description, isActive: true } },
      { upsert: true, new: true }
    );
    specialtyIds.set(name, spec!._id);
  }
  console.log(`Specialties ready: ${SPECIALTIES.length}`);

  // Admin
  if (await User.exists({ email: adminEmail })) {
    console.log(`Admin exists (unchanged): ${adminEmail}`);
  } else {
    await User.create({
      name: env.SEED_ADMIN_NAME ?? "System Admin",
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: "admin",
    });
    console.log(`Admin created: ${adminEmail}`);
  }

  // Doctors (user + profile) - sample data only
  const doctorHash = withSampleDoctors ? await hashPassword(doctorPassword) : "";
  let created = 0;
  for (const d of withSampleDoctors ? DOCTORS : []) {
    let user = await User.findOne({ email: d.email });
    if (!user) user = await User.create({ name: d.name, email: d.email, passwordHash: doctorHash, role: "doctor" });
    if (await Doctor.exists({ user: user._id })) continue;
    await Doctor.create({
      user: user._id,
      specialty: specialtyIds.get(d.specialty),
      bio: d.bio,
      qualifications: d.qualifications,
      experienceYears: d.years,
      consultationFee: d.fee,
      slotDurationMinutes: 30,
      availability: d.availability,
      isApproved: true,
    });
    created++;
  }
  console.log(withSampleDoctors ? `Doctors ready: ${DOCTORS.length} (${created} newly created)` : "Sample doctors skipped (SEED_SAMPLE_DOCTORS=false)");
  if (!isProd) console.log("Dev credentials come from .env (see SEED_* values).");
}

main()
  .then(() => disconnectDB())
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await disconnectDB().catch(() => undefined);
    process.exit(1);
  });
