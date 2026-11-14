import type { Appointment, Availability, AppointmentStatus, Payment, Review, Specialty, User } from "@/types";
import { addDays, slugify } from "../utils";

export type RawUser = User & { password: string };
export interface RawDoctor {
  _id: string; user: string; specialty: string; bio?: string; qualifications: string[]; experienceYears: number;
  consultationFee: number; slotDurationMinutes: number; availability: Availability[]; isApproved: boolean; createdAt: string;
}
export type RawAppointment = Omit<Appointment, "patient" | "doctor" | "payment" | "review"> & { patient: string; doctor: string };
export type RawPayment = Payment;
export type RawReview = Omit<Review, "patient"> & { patient: string };
export interface MockDb {
  users: RawUser[]; specialties: Specialty[]; doctors: RawDoctor[];
  appointments: RawAppointment[]; payments: RawPayment[]; reviews: RawReview[];
}

const KEY = "dab_mock_db_v1";
export const DEMO_PASSWORD = "Password123!";
let cache: MockDb | null = null;

export const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

function weekdays(start: string, end: string, days = [1, 2, 3, 4, 5]): Availability[] {
  return days.map((dayOfWeek) => ({ dayOfWeek, startTime: start, endTime: end }));
}

function seed(): MockDb {
  const now = new Date().toISOString();
  const specNames: [string, string][] = [
    ["Cardiology", "Heart and blood-vessel care, from checkups to long-term management."],
    ["Dermatology", "Skin, hair and nail conditions for all ages."],
    ["Pediatrics", "Healthcare for infants, children and teenagers."],
    ["Orthopedics", "Bones, joints, muscles and sports injuries."],
    ["Gynecology", "Women's reproductive and maternal health."],
    ["Neurology", "Brain, spine and nervous system disorders."],
    ["ENT", "Ear, nose and throat conditions."],
    ["General Medicine", "First point of care for everyday health concerns."],
  ];
  const specialties: Specialty[] = specNames.map(([name, description], i) => ({
    _id: `s_${i + 1}`, name, slug: slugify(name), description, isActive: true,
  }));

  const mkUser = (id: string, name: string, email: string, role: User["role"], phone: string, doctorId?: string): RawUser => ({
    _id: id, name, email, role, phone, isActive: true, doctorId, password: DEMO_PASSWORD, createdAt: now,
  });
  const users: RawUser[] = [
    mkUser("u_admin", "Maryam Qureshi", "admin@mediora.pk", "admin", "+92 300 1112233"),
    mkUser("u_d1", "Dr. Sarah Ahmed", "sarah.ahmed@mediora.pk", "doctor", "+92 301 2223344", "d_1"),
    mkUser("u_d2", "Dr. Imran Malik", "imran.malik@mediora.pk", "doctor", "+92 302 3334455", "d_2"),
    mkUser("u_d3", "Dr. Ayesha Siddiqui", "ayesha.siddiqui@mediora.pk", "doctor", "+92 303 4445566", "d_3"),
    mkUser("u_d4", "Dr. Hassan Raza", "hassan.raza@mediora.pk", "doctor", "+92 304 5556677", "d_4"),
    mkUser("u_d5", "Dr. Nadia Hussain", "nadia.hussain@mediora.pk", "doctor", "+92 305 6667788", "d_5"),
    mkUser("u_d6", "Dr. Bilal Chaudhry", "bilal.chaudhry@mediora.pk", "doctor", "+92 306 7778899", "d_6"),
    mkUser("u_d7", "Dr. Fatima Noor", "fatima.noor@mediora.pk", "doctor", "+92 307 8889900", "d_7"),
    mkUser("u_d8", "Dr. Omar Farooq", "omar.farooq@mediora.pk", "doctor", "+92 308 9990011", "d_8"),
    mkUser("u_p1", "Ali Khan", "ali.khan@example.com", "patient", "+92 321 1234567"),
    mkUser("u_p2", "Zainab Tariq", "zainab.tariq@example.com", "patient", "+92 322 2345678"),
    mkUser("u_p3", "Usman Sheikh", "usman.sheikh@example.com", "patient", "+92 333 3456789"),
    mkUser("u_p4", "Hira Baig", "hira.baig@example.com", "patient", "+92 334 4567890"),
    mkUser("u_p5", "Daniyal Aslam", "daniyal.aslam@example.com", "patient", "+92 345 5678901"),
    mkUser("u_p6", "Sana Javed", "sana.javed@example.com", "patient", "+92 346 6789012"),
  ];

  const mkDoc = (n: number, spec: number, years: number, fee: number, quals: string[], bio: string, avail: Availability[], approved = true, dur = 30): RawDoctor => ({
    _id: `d_${n}`, user: `u_d${n}`, specialty: `s_${spec}`, bio, qualifications: quals, experienceYears: years,
    consultationFee: fee, slotDurationMinutes: dur, availability: avail, isApproved: approved, createdAt: now,
  });
  const doctors: RawDoctor[] = [
    mkDoc(1, 1, 12, 3500, ["MBBS, King Edward Medical University", "FCPS Cardiology", "Fellowship, Interventional Cardiology"],
      "Consultant cardiologist focused on preventive cardiology, hypertension and post-procedure recovery. Known for taking time to explain results in plain language.", weekdays("09:00", "13:00")),
    mkDoc(2, 2, 8, 2500, ["MBBS, Aga Khan University", "FCPS Dermatology"],
      "Treats acne, eczema, psoriasis and hair loss, with a special interest in teen and adult acne care.", [...weekdays("14:00", "18:00", [1, 3, 5]), { dayOfWeek: 6, startTime: "10:00", endTime: "14:00" }]),
    mkDoc(3, 3, 10, 2000, ["MBBS, Dow University", "MCPS Pediatrics"],
      "Child health specialist covering vaccinations, growth monitoring, feeding concerns and common childhood infections.", weekdays("10:00", "14:00", [1, 2, 3, 4, 6]), true, 20),
    mkDoc(4, 4, 15, 4000, ["MBBS, Rawalpindi Medical University", "FRCS Orthopedics"],
      "Orthopedic surgeon specialising in knee and shoulder injuries, joint replacement and sports medicine.", weekdays("11:00", "16:00", [2, 3, 4])),
    mkDoc(5, 5, 11, 3000, ["MBBS, Lahore Medical College", "FCPS Gynecology & Obstetrics"],
      "Provides antenatal care, fertility counselling and routine women's health checkups in a supportive setting.", weekdays("09:00", "12:30", [1, 2, 4, 5])),
    mkDoc(6, 6, 14, 4500, ["MBBS, Army Medical College", "FCPS Neurology", "MSc Clinical Neurophysiology"],
      "Neurologist treating migraines, epilepsy, stroke recovery and movement disorders.", weekdays("15:00", "19:00", [1, 3, 4])),
    mkDoc(7, 8, 5, 1500, ["MBBS, Shifa College of Medicine", "MRCGP (INT)"],
      "Family physician for everyday illnesses, chronic disease follow-up and health screenings.", weekdays("09:00", "17:00"), false),
    mkDoc(8, 7, 9, 2200, ["MBBS, Peshawar Medical College", "FCPS Otolaryngology"],
      "ENT specialist for sinus problems, hearing concerns, tonsil issues and voice disorders.", weekdays("10:00", "15:00", [1, 2, 3, 5])),
  ];

  const d = addDays;
  type A = [string, string, string, number, string, AppointmentStatus, string];
  const rows: A[] = [
    ["a1", "u_p1", "d_1", -21, "09:00", "completed", "Chest tightness after exercise"],
    ["a2", "u_p1", "d_3", -10, "10:20", "completed", "Child's recurring cough"],
    ["a3", "u_p1", "d_1", 2, "10:00", "confirmed", "Follow-up and ECG review"],
    ["a4", "u_p1", "d_2", 5, "14:30", "pending", "Persistent rash on forearm"],
    ["a5", "u_p1", "d_4", -5, "11:30", "cancelled", "Knee pain"],
    ["a6", "u_p2", "d_1", 0, "09:30", "confirmed", "Blood pressure monitoring"],
    ["a7", "u_p3", "d_1", 0, "11:00", "pending", "Palpitations at night"],
    ["a8", "u_p4", "d_1", 1, "09:00", "pending", "Routine heart checkup"],
    ["a9", "u_p2", "d_2", -3, "14:00", "completed", "Acne treatment review"],
    ["a10", "u_p5", "d_5", 3, "10:00", "confirmed", "Antenatal visit"],
    ["a11", "u_p6", "d_6", 4, "15:30", "pending", "Recurring migraines"],
    ["a12", "u_p3", "d_8", -7, "11:30", "completed", "Sinus congestion"],
    ["a13", "u_p4", "d_3", 1, "10:20", "confirmed", "Vaccination schedule"],
    ["a14", "u_p5", "d_1", -14, "10:30", "no_show", "Cholesterol consultation"],
    ["a15", "u_p6", "d_1", -2, "09:00", "completed", "Hypertension follow-up"],
    ["a16", "u_p2", "d_4", -30, "12:00", "completed", "Shoulder injury"],
    ["a17", "u_p3", "d_5", -18, "09:30", "completed", "Annual checkup"],
    ["a18", "u_p5", "d_6", -25, "16:00", "completed", "Dizziness and headaches"],
    ["a19", "u_p6", "d_2", -12, "15:00", "completed", "Skin allergy"],
    ["a20", "u_p4", "d_1", -40, "10:00", "completed", "Second opinion"],
  ];
  const appointments: RawAppointment[] = [];
  const payments: RawPayment[] = [];
  rows.forEach(([id, patient, doctor, off, start, status, reason], i) => {
    const doc = doctors.find((x) => x._id === doctor)!;
    const [h, m] = start.split(":").map(Number);
    const endMin = h * 60 + m + doc.slotDurationMinutes;
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    const date = d(off);
    appointments.push({
      _id: id, patient, doctor, date, startTime: start, endTime, status, reason, createdAt: now,
      notes: status === "completed" ? "Examination done. Advised follow-up in 4 weeks and lifestyle changes." : undefined,
      cancelledBy: status === "cancelled" ? patient : undefined,
    });
    const paid = status === "completed" || status === "no_show" || (status === "confirmed" && i % 2 === 0);
    payments.push({
      _id: `p_${id}`, appointment: id, patient, amount: doc.consultationFee, currency: "PKR",
      status: status === "cancelled" ? "refunded" : paid ? "paid" : "pending",
      method: paid || status === "cancelled" ? (i % 3 === 0 ? "card" : i % 3 === 1 ? "online" : "cash") : undefined,
      transactionRef: paid ? `TXN-${100000 + i * 137}` : undefined,
      paidAt: paid ? new Date(date + "T08:00:00").toISOString() : undefined, createdAt: now,
    });
  });

  const rv = (a: string, p: string, doc: string, rating: number, comment: string, off: number): RawReview => ({
    _id: `r_${a}`, appointment: a, patient: p, doctor: doc, rating, comment, createdAt: new Date(d(off) + "T12:00:00").toISOString(),
  });
  const reviews: RawReview[] = [
    rv("a1", "u_p1", "d_1", 5, "Dr. Ahmed explained every result clearly and never rushed me. Booking was effortless.", -20),
    rv("a2", "u_p1", "d_3", 4, "Great with children, my son was relaxed throughout. The wait was a little long.", -9),
    rv("a9", "u_p2", "d_2", 5, "My skin has improved a lot in two months. Clear treatment plan.", -2),
    rv("a12", "u_p3", "d_8", 4, "Quick diagnosis and practical advice.", -6),
    rv("a15", "u_p6", "d_1", 5, "Very thorough and reassuring.", -1),
    rv("a16", "u_p2", "d_4", 5, "Excellent surgeon. Recovery advice was spot on.", -29),
    rv("a17", "u_p3", "d_5", 4, "Warm, patient and professional.", -17),
    rv("a18", "u_p5", "d_6", 5, "Finally got answers about my headaches.", -24),
    rv("a19", "u_p6", "d_2", 4, "Helpful consultation, easy follow-up.", -11),
    rv("a20", "u_p4", "d_1", 5, "Confirmed my diagnosis and saved me from an unnecessary procedure.", -39),
  ];

  return { users, specialties, doctors, appointments, payments, reviews };
}

export function getDb(): MockDb {
  if (cache) return cache;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { cache = JSON.parse(raw) as MockDb; return cache; }
    } catch { /* fall through to seed */ }
  }
  cache = seed();
  saveDb();
  return cache;
}

export function saveDb(): void {
  if (typeof window === "undefined" || !cache) return;
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* storage full or blocked */ }
}

export function resetMockDb(): void {
  cache = seed();
  saveDb();
}
