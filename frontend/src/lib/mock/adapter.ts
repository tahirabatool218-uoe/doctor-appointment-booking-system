import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import type {
  Appointment, AppointmentStatus, Doctor, Payment, Review, Slot, User,
} from "@/types";
import {
  getDb, saveDb, uid, type RawAppointment, type RawDoctor, type RawUser,
} from "./db";
import { slugify, todayStr } from "../utils";

/**
 * In-browser mock of the REST API (see docs/API.md for the endpoint reference).
 * Enabled with NEXT_PUBLIC_USE_MOCK=true (default). Data persists in localStorage.
 */

class Fail extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
const fail = (status: number, code: string, message: string): never => { throw new Fail(status, code, message); };

type Query = Record<string, string | undefined>;
interface Ctx { params: Record<string, string>; query: Query; body: any; user: RawUser | null }
interface Result { status?: number; data?: unknown; meta?: unknown }
type Handler = (c: Ctx) => Result;

const routes: { method: string; re: RegExp; keys: string[]; handler: Handler }[] = [];
function on(method: string, path: string, handler: Handler) {
  const keys: string[] = [];
  const re = new RegExp("^" + path.replace(/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "$");
  routes.push({ method, re, keys, handler });
}

// ---------- helpers ----------
const strip = (u: RawUser): User => { const { password: _p, ...rest } = u; return rest; };
const auth = (c: Ctx, ...roles: User["role"][]): RawUser => {
  if (!c.user) return fail(401, "UNAUTHORIZED", "Please sign in to continue");
  if (roles.length && !roles.includes(c.user.role)) return fail(403, "FORBIDDEN", "You don't have permission to do this");
  return c.user;
};
function paginate<T>(list: T[], q: Query) {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.max(1, Number(q.limit) || 20);
  return { data: list.slice((page - 1) * limit, page * limit), meta: { page, limit, total: list.length } };
}
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

function popDoctor(d: RawDoctor): Doctor {
  const db = getDb();
  const user = db.users.find((u) => u._id === d.user)!;
  const specialty = db.specialties.find((s) => s._id === d.specialty)!;
  const rs = db.reviews.filter((r) => r.doctor === d._id);
  const { user: _u, specialty: _s, ...rest } = d;
  return {
    ...rest,
    user: { _id: user._id, name: user.name, email: user.email, phone: user.phone },
    specialty,
    ratingCount: rs.length,
    ratingAvg: rs.length ? Math.round((rs.reduce((a, r) => a + r.rating, 0) / rs.length) * 10) / 10 : 0,
  };
}
function popReview(r: ReturnType<typeof getDb>["reviews"][number]): Review {
  const p = getDb().users.find((u) => u._id === r.patient);
  return { ...r, patient: { _id: r.patient, name: p?.name ?? "Patient" } };
}
function popAppt(a: RawAppointment, full = false): Appointment {
  const db = getDb();
  const p = db.users.find((u) => u._id === a.patient)!;
  const base: Appointment = {
    ...a,
    patient: { _id: p._id, name: p.name, email: p.email, phone: p.phone },
    doctor: popDoctor(db.doctors.find((d) => d._id === a.doctor)!),
  };
  const pay = db.payments.find((x) => x.appointment === a._id);
  if (pay) base.payment = pay;
  if (full) {
    const r = db.reviews.find((x) => x.appointment === a._id);
    if (r) base.review = popReview(r);
  }
  return base;
}
const isDoctorOwner = (u: RawUser, a: RawAppointment) => getDb().doctors.find((d) => d._id === a.doctor)?.user === u._id;
const canSee = (u: RawUser, a: RawAppointment) => u.role === "admin" || a.patient === u._id || isDoctorOwner(u, a);

function genSlots(doc: RawDoctor, date: string): Slot[] {
  const db = getDb();
  const dow = new Date(`${date}T00:00:00`).getDay();
  const booked = new Set(
    db.appointments.filter((a) => a.doctor === doc._id && a.date === date && ["pending", "confirmed"].includes(a.status)).map((a) => a.startTime)
  );
  const now = new Date();
  const slots: Slot[] = [];
  doc.availability.filter((r) => r.dayOfWeek === dow).forEach((r) => {
    for (let t = toMin(r.startTime); t + doc.slotDurationMinutes <= toMin(r.endTime); t += doc.slotDurationMinutes) {
      const startTime = fromMin(t);
      const past = new Date(`${date}T${startTime}:00`) <= now;
      slots.push({ startTime, endTime: fromMin(t + doc.slotDurationMinutes), available: !booked.has(startTime) && !past });
    }
  });
  return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

// ---------- auth ----------
on("POST", "/auth/register", ({ body }) => {
  const db = getDb();
  const email = String(body.email ?? "").toLowerCase();
  if (db.users.some((u) => u.email === email)) fail(409, "CONFLICT", "An account with this email already exists");
  const user: RawUser = { _id: uid("u"), name: body.name, email, role: "patient", phone: body.phone, isActive: true, password: body.password, createdAt: new Date().toISOString() };
  db.users.push(user); saveDb();
  return { status: 201, data: { user: strip(user), token: `mock-token-${user._id}` } };
});
on("POST", "/auth/login", ({ body }) => {
  const u = getDb().users.find((x) => x.email === String(body.email ?? "").toLowerCase());
  if (!u || u.password !== body.password) fail(401, "UNAUTHORIZED", "Incorrect email or password");
  if (!u!.isActive) fail(401, "UNAUTHORIZED", "This account has been deactivated");
  return { data: { user: strip(u!), token: `mock-token-${u!._id}` } };
});
on("GET", "/auth/me", (c) => ({ data: { user: strip(auth(c)) } }));

// ---------- users ----------
on("GET", "/users", (c) => {
  auth(c, "admin");
  let list = getDb().users.map(strip);
  if (c.query.role) list = list.filter((u) => u.role === c.query.role);
  return paginate(list, c.query);
});
on("PATCH", "/users/me", (c) => {
  const u = auth(c);
  if (c.body.name !== undefined) u.name = c.body.name;
  if (c.body.phone !== undefined) u.phone = c.body.phone;
  saveDb();
  return { data: strip(u) };
});
on("PATCH", "/users/:id", (c) => {
  const me = auth(c, "admin");
  const u = getDb().users.find((x) => x._id === c.params.id) ?? fail(404, "NOT_FOUND", "User not found");
  if (u._id === me._id && (c.body.isActive === false || (c.body.role && c.body.role !== "admin"))) fail(400, "BAD_REQUEST", "You can't deactivate or demote your own account");
  if (c.body.isActive !== undefined) u.isActive = c.body.isActive;
  if (c.body.role) u.role = c.body.role;
  saveDb();
  return { data: strip(u) };
});

// ---------- specialties ----------
on("GET", "/specialties", () => ({ data: getDb().specialties }));
on("POST", "/specialties", (c) => {
  auth(c, "admin");
  const db = getDb();
  if (db.specialties.some((s) => s.name.toLowerCase() === String(c.body.name).toLowerCase())) fail(409, "CONFLICT", "A specialty with this name already exists");
  const s = { _id: uid("s"), name: c.body.name, slug: slugify(c.body.name), description: c.body.description, isActive: true };
  db.specialties.push(s); saveDb();
  return { status: 201, data: s };
});
on("PATCH", "/specialties/:id", (c) => {
  auth(c, "admin");
  const s = getDb().specialties.find((x) => x._id === c.params.id) ?? fail(404, "NOT_FOUND", "Specialty not found");
  if (c.body.name) { s.name = c.body.name; s.slug = slugify(c.body.name); }
  if (c.body.description !== undefined) s.description = c.body.description;
  if (c.body.isActive !== undefined) s.isActive = c.body.isActive;
  saveDb();
  return { data: s };
});
on("DELETE", "/specialties/:id", (c) => {
  auth(c, "admin");
  const db = getDb();
  if (db.doctors.some((d) => d.specialty === c.params.id)) fail(409, "CONFLICT", "Doctors still use this specialty. Reassign them or deactivate it instead.");
  const i = db.specialties.findIndex((x) => x._id === c.params.id);
  if (i < 0) fail(404, "NOT_FOUND", "Specialty not found");
  db.specialties.splice(i, 1); saveDb();
  return { status: 204 };
});

// ---------- doctors ----------
on("GET", "/doctors", (c) => {
  const db = getDb();
  const showAll = c.user?.role === "admin" && c.query.includeUnapproved === "true";
  let list = db.doctors.filter((d) => showAll || d.isApproved).map(popDoctor);
  if (!showAll) list = list.filter((d) => d.specialty.isActive);
  if (c.query.specialty) list = list.filter((d) => d.specialty._id === c.query.specialty);
  if (c.query.q) {
    const q = c.query.q.toLowerCase();
    list = list.filter((d) => [d.user.name, d.specialty.name, d.bio ?? ""].some((s) => s.toLowerCase().includes(q)));
  }
  list.sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount);
  return paginate(list, c.query);
});
on("GET", "/doctors/:id", (c) => {
  const d = getDb().doctors.find((x) => x._id === c.params.id);
  if (!d || (!d.isApproved && c.user?.role !== "admin" && c.user?._id !== d.user)) fail(404, "NOT_FOUND", "Doctor not found");
  return { data: popDoctor(d!) };
});
on("POST", "/doctors", (c) => {
  auth(c, "admin");
  const db = getDb(); const b = c.body;
  if (db.users.some((u) => u.email === String(b.email).toLowerCase())) fail(409, "CONFLICT", "An account with this email already exists");
  if (!db.specialties.some((s) => s._id === b.specialty)) fail(400, "BAD_REQUEST", "Unknown specialty");
  const id = uid("d");
  db.users.push({ _id: uid("u"), name: b.name, email: String(b.email).toLowerCase(), role: "doctor", isActive: true, password: b.password, doctorId: id, createdAt: new Date().toISOString() });
  const doc: RawDoctor = {
    _id: id, user: db.users[db.users.length - 1]._id, specialty: b.specialty, bio: b.bio, qualifications: b.qualifications ?? [],
    experienceYears: b.experienceYears ?? 0, consultationFee: b.consultationFee, slotDurationMinutes: 30,
    availability: b.availability ?? [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startTime: "09:00", endTime: "13:00" })),
    isApproved: b.isApproved ?? false, createdAt: new Date().toISOString(),
  };
  db.doctors.push(doc); saveDb();
  return { status: 201, data: popDoctor(doc) };
});
on("PATCH", "/doctors/:id/approve", (c) => {
  auth(c, "admin");
  const d = getDb().doctors.find((x) => x._id === c.params.id) ?? fail(404, "NOT_FOUND", "Doctor not found");
  d.isApproved = !!c.body.isApproved; saveDb();
  return { data: popDoctor(d) };
});
on("GET", "/doctors/:id/slots", (c) => {
  const d = getDb().doctors.find((x) => x._id === c.params.id) ?? fail(404, "NOT_FOUND", "Doctor not found");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.query.date ?? "")) fail(400, "VALIDATION_ERROR", "date must be YYYY-MM-DD");
  return { data: { date: c.query.date, slots: genSlots(d, c.query.date!) } };
});
on("GET", "/doctors/:id/reviews", (c) => {
  const list = getDb().reviews.filter((r) => r.doctor === c.params.id).map(popReview)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return paginate(list, c.query);
});
on("PATCH", "/doctors/:id", (c) => {
  const me = auth(c, "admin", "doctor");
  const d = getDb().doctors.find((x) => x._id === c.params.id) ?? fail(404, "NOT_FOUND", "Doctor not found");
  if (me.role === "doctor" && d.user !== me._id) fail(403, "FORBIDDEN", "You can only edit your own profile");
  const b = c.body;
  (["bio", "qualifications", "experienceYears", "consultationFee", "slotDurationMinutes", "availability"] as const).forEach((k) => {
    if (b[k] !== undefined) (d as any)[k] = b[k];
  });
  if (b.specialty) d.specialty = b.specialty;
  saveDb();
  return { data: popDoctor(d) };
});

// ---------- appointments ----------
on("POST", "/appointments", (c) => {
  const me = auth(c, "patient");
  const db = getDb(); const b = c.body;
  const doc = db.doctors.find((d) => d._id === b.doctor);
  if (!doc || !doc.isApproved) fail(404, "NOT_FOUND", "Doctor not found");
  if (b.date < todayStr()) fail(400, "BAD_REQUEST", "Choose a date that isn't in the past");
  const slot = genSlots(doc!, b.date).find((s) => s.startTime === b.startTime);
  if (!slot) fail(400, "BAD_REQUEST", "That time is outside the doctor's availability");
  if (!slot!.available) fail(409, "CONFLICT", "That slot was just taken. Pick another time.");
  const a: RawAppointment = {
    _id: uid("a"), patient: me._id, doctor: doc!._id, date: b.date, startTime: slot!.startTime, endTime: slot!.endTime,
    status: "pending", reason: b.reason, createdAt: new Date().toISOString(),
  };
  db.appointments.push(a);
  db.payments.push({ _id: uid("p"), appointment: a._id, patient: me._id, amount: doc!.consultationFee, currency: "PKR", status: "pending", createdAt: new Date().toISOString() });
  saveDb();
  return { status: 201, data: popAppt(a) };
});
on("GET", "/appointments", (c) => {
  const me = auth(c);
  let list = getDb().appointments.filter((a) => me.role === "admin" || (me.role === "patient" ? a.patient === me._id : isDoctorOwner(me, a)));
  if (c.query.status) list = list.filter((a) => a.status === c.query.status);
  if (c.query.date) list = list.filter((a) => a.date === c.query.date);
  list.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const p = paginate(list, c.query);
  return { data: p.data.map((a) => popAppt(a)), meta: p.meta };
});
on("GET", "/appointments/:id", (c) => {
  const me = auth(c);
  const a = getDb().appointments.find((x) => x._id === c.params.id) ?? fail(404, "NOT_FOUND", "Appointment not found");
  if (!canSee(me, a)) fail(403, "FORBIDDEN", "You can't view this appointment");
  return { data: popAppt(a, true) };
});
const TRANSITIONS: Record<string, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"], confirmed: ["completed", "cancelled", "no_show"],
};
on("PATCH", "/appointments/:id/status", (c) => {
  const me = auth(c);
  const db = getDb();
  const a = db.appointments.find((x) => x._id === c.params.id) ?? fail(404, "NOT_FOUND", "Appointment not found");
  if (!canSee(me, a)) fail(403, "FORBIDDEN", "You can't change this appointment");
  const next = c.body.status as AppointmentStatus;
  if (!TRANSITIONS[a.status]?.includes(next)) fail(400, "BAD_REQUEST", `A ${a.status.replace("_", " ")} appointment can't be marked ${next.replace("_", " ")}`);
  if (next !== "cancelled" && me.role === "patient") fail(403, "FORBIDDEN", "Only your doctor can update this status");
  a.status = next;
  if (c.body.notes !== undefined) a.notes = c.body.notes;
  if (next === "cancelled") {
    a.cancelledBy = me._id;
    const pay = db.payments.find((p) => p.appointment === a._id);
    if (pay?.status === "paid") pay.status = "refunded";
  }
  saveDb();
  return { data: popAppt(a, true) };
});

// ---------- payments ----------
on("GET", "/payments", (c) => {
  const me = auth(c);
  const db = getDb();
  let list = db.payments.filter((p) => {
    const a = db.appointments.find((x) => x._id === p.appointment);
    return a && (me.role === "admin" || (me.role === "patient" ? p.patient === me._id : isDoctorOwner(me, a)));
  });
  if (c.query.status) list = list.filter((p) => p.status === c.query.status);
  return paginate(list, c.query);
});
on("POST", "/payments/:id/pay", (c) => {
  const me = auth(c, "patient");
  const db = getDb();
  const pay = db.payments.find((p) => p.appointment === c.params.id) ?? fail(404, "NOT_FOUND", "Payment not found");
  if (pay.patient !== me._id) fail(403, "FORBIDDEN", "This isn't your payment");
  if (pay.status === "paid") fail(409, "CONFLICT", "This appointment is already paid");
  const appt = db.appointments.find((a) => a._id === pay.appointment)!;
  if (appt.status === "cancelled") fail(400, "BAD_REQUEST", "Cancelled appointments can't be paid");
  Object.assign(pay, { status: "paid", method: c.body.method, transactionRef: c.body.transactionRef || `TXN-${Date.now().toString().slice(-8)}`, paidAt: new Date().toISOString() });
  saveDb();
  return { data: pay as Payment };
});

// ---------- reviews ----------
on("POST", "/reviews", (c) => {
  const me = auth(c, "patient");
  const db = getDb();
  const a = db.appointments.find((x) => x._id === c.body.appointment) ?? fail(404, "NOT_FOUND", "Appointment not found");
  if (a.patient !== me._id) fail(403, "FORBIDDEN", "You can only review your own appointments");
  if (a.status !== "completed") fail(400, "BAD_REQUEST", "You can review an appointment once it's completed");
  if (db.reviews.some((r) => r.appointment === a._id)) fail(409, "CONFLICT", "You've already reviewed this appointment");
  const r = { _id: uid("r"), appointment: a._id, patient: me._id, doctor: a.doctor, rating: c.body.rating, comment: c.body.comment, createdAt: new Date().toISOString() };
  db.reviews.push(r); saveDb();
  return { status: 201, data: popReview(r) };
});

// ---------- adapter ----------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function mockAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  await sleep(250 + Math.random() * 250);
  const method = (config.method ?? "get").toUpperCase();
  const [pathRaw, qs] = (config.url ?? "").replace(config.baseURL ?? "", "").split("?");
  const path = pathRaw.startsWith("/") ? pathRaw : `/${pathRaw}`;
  const query: Query = {};
  new URLSearchParams(qs ?? "").forEach((v, k) => { query[k] = v; });
  Object.entries(config.params ?? {}).forEach(([k, v]) => { if (v !== undefined && v !== "") query[k] = String(v); });

  let body: any = config.data;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }

  const header = (config.headers as any)?.Authorization ?? (config.headers as any)?.get?.("Authorization");
  const token = typeof header === "string" ? header.replace("Bearer ", "") : "";
  const user = token.startsWith("mock-token-") ? getDb().users.find((u) => u._id === token.slice(11) && u.isActive) ?? null : null;

  const respond = (status: number, payload: unknown): AxiosResponse => ({
    data: payload, status, statusText: String(status), headers: {}, config, request: {},
  });

  try {
    for (const r of routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(path);
      if (!m) continue;
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      const out = r.handler({ params, query, body: body ?? {}, user });
      const status = out.status ?? 200;
      if (status === 204) return respond(204, undefined);
      // list handlers return {data, meta}; others return {data}
      return respond(status, out.meta ? { data: out.data, meta: out.meta } : { data: out.data });
    }
    throw new Fail(404, "NOT_FOUND", "Route not found");
  } catch (e) {
    const f = e instanceof Fail ? e : new Fail(500, "INTERNAL_ERROR", "Mock server error");
    if (!(e instanceof Fail)) console.error(e);
    const res = respond(f.status, { error: { code: f.code, message: f.message } });
    throw new AxiosError(f.message, String(f.status), config, {}, res);
  }
}
