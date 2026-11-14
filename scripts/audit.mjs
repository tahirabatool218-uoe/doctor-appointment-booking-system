// Focused audit probes. API=http://localhost:5000/api node scripts/audit.mjs  (needs seeded DB, creates test data)
import crypto from "node:crypto";
const API = process.env.API || "http://localhost:5000/api";
const ADMIN = { email: process.env.ADMIN_EMAIL || "admin@clinic.example", password: process.env.ADMIN_PASSWORD || "Admin@12345" };
const DOCP = process.env.DOCTOR_PASSWORD || "Doctor@12345";
let pass = 0, fail = 0; const fails = [];
const ok = (n, c, x = "") => { c ? pass++ : (fail++, fails.push(n)); console.log(`${c ? "PASS" : "FAIL"}  ${n}${c ? "" : "  -> " + x}`); };
async function call(method, path, token, body, raw) {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: raw ?? (body ? JSON.stringify(body) : undefined) });
  let j = null; try { j = await r.json(); } catch {} return { s: r.status, j, h: r.headers };
}
const S = Date.now(), WEEKS = Math.floor(Math.random() * 50) * 7;
const day = (ahead, dow) => { const d = new Date(Date.now() + (ahead + WEEKS) * 864e5); while (d.getUTCDay() !== dow) d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const hdr = (t) => JSON.parse(Buffer.from(t.split(".")[0], "base64url"));

// ---------- registration / login
let r = await call("POST", "/auth/register", null, { name: "Aud Patient", email: `aud${S}@t.example`, password: "Patient@123", role: "admin" });
ok("register: 201 and role forced to patient even if role=admin sent", r.s === 201 && r.j.data.user.role === "patient", JSON.stringify(r.j)); const P = r.j?.data;
ok("register: response has no passwordHash", !JSON.stringify(r.j).includes("passwordHash"));
r = await call("POST", "/auth/register", null, { name: "A", email: "bad", password: "x" }); ok("register: invalid body -> 400 VALIDATION_ERROR w/ details", r.s === 400 && r.j.error.code === "VALIDATION_ERROR" && Array.isArray(r.j.error.details), JSON.stringify(r.j));
r = await call("POST", "/auth/register", null, { name: "Dup", email: `AUD${S}@T.example`, password: "Patient@123" }); ok("register: email uniqueness is case-insensitive -> 409", r.s === 409, r.s);
r = await call("POST", "/auth/register", null, null, "{bad json"); ok("malformed JSON -> 400 INVALID_JSON", r.s === 400 && r.j?.error?.code === "INVALID_JSON", `${r.s} ${JSON.stringify(r.j)}`);
r = await call("POST", "/auth/login", null, { email: `aud${S}@t.example`, password: "Patient@123" }); ok("login: ok (email case-insens.)", r.s === 200 && r.j.data.token);
r = await call("POST", "/auth/login", null, { email: { $ne: "" }, password: { $ne: "" } }); ok("login: NoSQL-injection object body rejected (400)", r.s === 400, `${r.s} ${JSON.stringify(r.j)}`);
r = await call("POST", "/auth/login", null, { email: "nobody@t.example", password: "Whatever1" }); ok("login: unknown email -> 401 same message", r.s === 401 && r.j.error.code === "INVALID_CREDENTIALS", r.s);
r = await call("POST", "/auth/login", null, ADMIN); const A = r.j?.data; ok("admin login", r.s === 200 && A.user.role === "admin", JSON.stringify(r.j));
r = await call("POST", "/auth/login", null, { email: "ayesha.khan@clinic.example", password: DOCP }); const D = r.j?.data; ok("doctor login (+doctorId)", r.s === 200 && D.user.role === "doctor" && D.user.doctorId, JSON.stringify(r.j));
r = await call("POST", "/auth/login", null, { email: "bilal.ahmed@clinic.example", password: DOCP }); const D2 = r.j?.data;

// ---------- JWT
const [h, p, sig] = P.token.split(".");
ok("jwt: HS256, has sub/role/exp", hdr(P.token).alg === "HS256" && JSON.parse(Buffer.from(p, "base64url")).exp > 0);
const forgedAdmin = `${h}.${b64({ ...JSON.parse(Buffer.from(p, "base64url")), role: "admin" })}.${sig}`;
r = await call("GET", "/users", forgedAdmin); ok("jwt: payload-tampered token rejected (401)", r.s === 401, r.s);
const none = `${b64({ alg: "none", typ: "JWT" })}.${p}.`; r = await call("GET", "/auth/me", none); ok("jwt: alg=none rejected (401)", r.s === 401, r.s);
const wrong = (() => { const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: A.user._id, role: "admin", exp: Math.floor(Date.now() / 1e3) + 3600 })}`; return body + "." + crypto.createHmac("sha256", "wrong-secret").update(body).digest("base64url"); })();
r = await call("GET", "/users", wrong); ok("jwt: token signed with wrong secret rejected (401)", r.s === 401, r.s);
r = await call("GET", "/auth/me", null); ok("jwt: missing token -> 401 UNAUTHORIZED", r.s === 401 && r.j.error.code === "UNAUTHORIZED", r.s);
r = await call("GET", "/auth/me", P.token); ok("jwt: valid token -> /auth/me", r.s === 200 && r.j.data.user.email === `aud${S}@t.example`);
// role comes from DB, not token: admin demotes/deactivates user -> token stops working
r = await call("POST", "/auth/register", null, { name: "Victim User", email: `vic${S}@t.example`, password: "Patient@123" }); const V = r.j.data;
r = await call("PATCH", `/users/${V.user._id}`, A.token, { isActive: false }); ok("admin deactivates user", r.s === 200 && r.j.data.isActive === false, r.s);
r = await call("GET", "/auth/me", V.token); ok("deactivated user's existing token -> 401", r.s === 401, r.s);
r = await call("POST", "/auth/login", null, { email: `vic${S}@t.example`, password: "Patient@123" }); ok("deactivated user login -> 401 ACCOUNT_DISABLED", r.s === 401 && r.j.error.code === "ACCOUNT_DISABLED", JSON.stringify(r.j));

// ---------- authorization matrix
const M = [
  ["GET", "/users", { patient: 403, doctor: 403, admin: 200 }],
  ["POST", "/specialties", { patient: 403, doctor: 403 }, { name: "x" }],
  ["POST", "/doctors", { patient: 403, doctor: 403 }, {}],
  ["GET", "/dashboard/admin", { patient: 403, doctor: 403, admin: 200 }],
  ["GET", "/dashboard/doctor", { patient: 403, admin: 403, doctor: 200 }],
  ["GET", "/dashboard/patient", { doctor: 403, admin: 403, patient: 200 }],
  ["GET", "/doctors/me", { patient: 403, admin: 403, doctor: 200 }],
  ["POST", "/appointments", { doctor: 403, admin: 403 }, {}],
  ["PATCH", "/payments/000000000000000000000000/refund", { patient: 403, doctor: 403 }],
  ["DELETE", "/reviews/000000000000000000000000", { patient: 403, doctor: 403 }],
  ["PATCH", "/appointments/000000000000000000000000/respond", { patient: 403 }, { action: "accept" }],
];
const tok = { patient: P.token, doctor: D.token, admin: A.token };
for (const [m, path, exp, body] of M) for (const [role, code] of Object.entries(exp)) { r = await call(m, path, tok[role], body); ok(`authz: ${role} ${m} ${path} -> ${code}`, r.s === code, r.s); }

// ---------- specialties / doctors
r = await call("GET", "/specialties"); const specs = r.j.data; const cardio = specs.find((s) => s.name === "Cardiology");
r = await call("POST", "/specialties", A.token, { name: "Cardiology" }); ok("specialty: duplicate name -> 409", r.s === 409, r.s);
r = await call("GET", "/doctors/not-an-id"); ok("invalid ObjectId -> 400 (not 500)", r.s === 400, `${r.s} ${JSON.stringify(r.j)}`);
r = await call("GET", "/doctors/000000000000000000000000"); ok("unknown doctor id -> 404", r.s === 404, r.s);
r = await call("GET", "/nope"); ok("unknown route -> 404 JSON", r.s === 404 && r.j?.error?.code === "NOT_FOUND", r.s);
r = await call("GET", "/doctors?limit=100000"); ok("pagination: huge limit clamped or 400 (no 500)", r.s === 400 || (r.s === 200 && r.j.meta.limit <= 100), `${r.s} ${JSON.stringify(r.j?.meta)}`);
r = await call("GET", "/doctors?sort=%24where"); ok("doctors: junk sort param doesn't 500", r.s < 500, r.s);
const doctor = (await call("GET", "/doctors?q=Ayesha")).j.data[0]; const doctor2 = (await call("GET", "/doctors?q=Bilal")).j.data[0];
r = await call("PATCH", `/doctors/${doctor._id}`, D2.token, { consultationFee: 1 }); ok("doctor cannot edit ANOTHER doctor's profile (403)", r.s === 403, r.s);
r = await call("PUT", `/doctors/${doctor._id}/availability`, D2.token, { slotDurationMinutes: 30, availability: [] }); ok("doctor cannot edit another doctor's availability (403)", r.s === 403, r.s);
r = await call("PATCH", `/doctors/${doctor._id}`, D.token, { isApproved: false }); ok("doctor cannot self-approve/unapprove via PATCH (ignored or 4xx; isApproved unchanged)", (await call("GET", `/doctors/${doctor._id}`)).j.data.isApproved === true, JSON.stringify(r.j).slice(0, 150));
r = await call("PATCH", `/doctors/${doctor._id}`, D.token, { consultationFee: -5 }); ok("doctor: negative fee -> 400", r.s === 400, r.s);

// ---------- appointments
const date = day(4, 1), t = "09:00";
r = await call("POST", "/appointments", P.token, { doctor: doctor._id, date, startTime: t, reason: "x".repeat(3) }); const a1 = r.j?.data; ok("book -> 201 pending, payment pending", r.s === 201 && a1.status === "pending" && a1.payment.status === "pending" && a1.payment.amount === doctor.consultationFee, JSON.stringify(r.j));
r = await call("POST", "/auth/register", null, { name: "Second Pat", email: `p2${S}@t.example`, password: "Patient@123" }); const P2 = r.j.data;
r = await call("POST", "/appointments", P2.token, { doctor: doctor._id, date, startTime: t }); ok("conflict (pending slot) -> 409 SLOT_TAKEN", r.s === 409 && r.j.error.code === "SLOT_TAKEN", JSON.stringify(r.j));
r = await call("POST", "/appointments", P.token, { doctor: doctor._id, date, startTime: t }); ok("same patient same slot -> 409", r.s === 409, r.s);
r = await call("POST", "/appointments", P2.token, { doctor: doctor._id, date, startTime: "09:15" }); ok("off-grid time (09:15, 30-min slots) -> 400", r.s === 400, `${r.s} ${JSON.stringify(r.j)}`);
r = await call("POST", "/appointments", P2.token, { doctor: doctor._id, date: "2026-13-45", startTime: t }); ok("invalid date -> 400", r.s === 400, r.s);
r = await call("POST", "/appointments", P2.token, { doctor: doctor._id, date: day(4, 0), startTime: t }); ok("doctor off-day (Sunday) -> 400", r.s === 400, r.s);
r = await call("POST", "/appointments", P2.token, { doctor: "000000000000000000000000", date, startTime: "10:00" }); ok("unknown doctor -> 404", r.s === 404, r.s);
// race: 8 parallel bookings same slot
const rd = day(5, 3); const race = await Promise.all(Array.from({ length: 8 }, (_, i) => call("POST", "/appointments", i % 2 ? P.token : P2.token, { doctor: doctor._id, date: rd, startTime: "10:00" })));
const codes = race.map((x) => x.s).sort(); ok("race: 8 parallel bookings -> exactly one 201, rest 409", codes.filter((c) => c === 201).length === 1 && codes.filter((c) => c === 409).length === 7, codes.join(","));
const raceWin = race.find((x) => x.s === 201).j.data;
// unapproved doctor not bookable
r = await call("POST", "/doctors", A.token, { name: "Dr Hidden", email: `hid${S}@c.example`, password: "Doctor@12345", specialty: cardio._id, consultationFee: 500, isApproved: false, availability: [{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }] }); const hid = r.j?.data; ok("admin creates unapproved doctor (201)", r.s === 201, JSON.stringify(r.j));
r = await call("POST", "/appointments", P.token, { doctor: hid?._id, date, startTime: "09:00" }); ok("unapproved doctor not bookable -> 404", r.s === 404, r.s);
// visibility
r = await call("GET", `/appointments/${a1._id}`, P2.token); ok("read other patient's appt -> 403", r.s === 403, r.s);
r = await call("GET", `/appointments/${a1._id}`, D2.token); ok("read other doctor's appt -> 403", r.s === 403, r.s);
r = await call("GET", `/appointments/${a1._id}`, D.token); ok("treating doctor reads appt", r.s === 200, r.s);
r = await call("GET", "/appointments", P2.token); ok("patient list is scoped (does not include others')", r.s === 200 && !r.j.data.some((x) => x._id === a1._id), r.s);
r = await call("GET", `/appointments?patient=${P.user._id}`, P2.token); ok("patient can't widen scope via ?patient= filter", r.s === 200 && !r.j.data.some((x) => x._id === a1._id), r.s);
r = await call("GET", "/appointments?status=bogus", A.token); ok("invalid status filter -> 400", r.s === 400, r.s);
// status transitions
r = await call("PATCH", `/appointments/${a1._id}/status`, P.token, { status: "completed" }); ok("patient -> completed forbidden (403)", r.s === 403, r.s);
r = await call("PATCH", `/appointments/${a1._id}/status`, D2.token, { status: "confirmed" }); ok("other doctor cannot confirm (403)", r.s === 403, r.s);
r = await call("PATCH", `/appointments/${a1._id}/status`, D.token, { status: "completed" }); ok("pending -> completed blocked (400)", r.s === 400, r.s);
r = await call("PATCH", `/appointments/${a1._id}/status`, D.token, { status: "pending" }); ok("status=pending rejected by validator (400)", r.s === 400, r.s);
r = await call("PATCH", `/appointments/${a1._id}/respond`, D.token, { action: "reject", reason: "Unavailable" }); ok("doctor rejects pending -> cancelled + notes", r.s === 200 && r.j.data.status === "cancelled" && r.j.data.notes === "Unavailable", JSON.stringify(r.j));
r = await call("PATCH", `/appointments/${a1._id}/respond`, D.token, { action: "accept" }); ok("respond on non-pending -> 400", r.s === 400, r.s);
r = await call("POST", "/appointments", P2.token, { doctor: doctor._id, date, startTime: t }); const a2 = r.j?.data; ok("rejected slot immediately rebookable (201)", r.s === 201, JSON.stringify(r.j));
r = await call("PATCH", `/appointments/${a2._id}/respond`, D.token, { action: "accept" }); ok("accept -> confirmed", r.s === 200 && r.j.data.status === "confirmed", r.s);
// cancellation window: confirmed appt starting soon (use today if possible via admin? use TZ aware) -> create near-term slot
// patient pays then cancels -> refund; non-owner cannot pay/cancel
r = await call("POST", `/payments/${a2._id}/pay`, P.token, { method: "card" }); ok("non-owner patient pay -> 403/404", [403, 404].includes(r.s), r.s);
r = await call("POST", `/payments/${a2._id}/pay`, P2.token, { method: "bitcoin" }); ok("invalid payment method -> 400", r.s === 400, r.s);
r = await call("POST", `/payments/${a2._id}/pay`, P2.token, { method: "cash" }); ok("patient pays (cash) -> 200 paid", r.s === 200 && r.j.data.status === "paid" && r.j.data.paidAt, JSON.stringify(r.j));
r = await call("PATCH", `/appointments/${a2._id}/status`, P.token, { status: "cancelled" }); ok("non-owner patient cancel -> 403", r.s === 403, r.s);
r = await call("PATCH", `/appointments/${a2._id}/status`, P2.token, { status: "cancelled" }); ok("owner cancels paid confirmed appt -> 200", r.s === 200 && r.j.data.status === "cancelled", JSON.stringify(r.j));
ok("  ...payment auto-refunded", r.j?.data?.payment?.status === "refunded", JSON.stringify(r.j?.data?.payment));
r = await call("POST", `/payments/${a2._id}/pay`, P2.token, { method: "card" }); ok("cannot pay a cancelled appointment (4xx)", r.s >= 400 && r.s < 500, r.s);
r = await call("GET", "/payments", P2.token); ok("patient payment list scoped to self", r.s === 200 && r.j.data.every((x) => String(x.patient?._id ?? x.patient) === P2.user._id), JSON.stringify(r.j).slice(0, 200));
const refunded = r.j?.data?.find((x) => x.status === "refunded");
r = await call("GET", `/payments/${refunded?._id}`, P.token); ok("other patient can't read payment (403/404)", [403, 404].includes(r.s), r.s);
r = await call("PATCH", `/payments/${refunded?._id}/refund`, A.token); ok("admin refund of already-refunded payment -> 4xx", r.s >= 400 && r.s < 500, `${r.s} ${JSON.stringify(r.j)}`);
// completed flow + no_show + review rules
const d3 = day(6, 2);
r = await call("POST", "/appointments", P.token, { doctor: doctor._id, date: d3, startTime: "09:00" }); const a3 = r.j.data;
await call("PATCH", `/appointments/${a3._id}/respond`, D.token, { action: "accept" });
r = await call("POST", "/reviews", P.token, { appointment: a3._id, rating: 5 }); ok("review before completion -> 4xx", r.s >= 400 && r.s < 500, r.s);
r = await call("PATCH", `/appointments/${a3._id}/status`, D.token, { status: "completed", notes: "Done" }); ok("doctor completes", r.s === 200 && r.j.data.status === "completed", r.s);
r = await call("POST", "/reviews", P2.token, { appointment: a3._id, rating: 5 }); ok("non-owner can't review (403/404)", [403, 404].includes(r.s), r.s);
r = await call("POST", "/reviews", P.token, { appointment: a3._id, rating: 6 }); ok("rating 6 -> 400", r.s === 400, r.s);
r = await call("POST", "/reviews", P.token, { appointment: a3._id, rating: 4, comment: "ok" }); ok("review -> 201", r.s === 201, JSON.stringify(r.j));
const dd = (await call("GET", `/doctors/${doctor._id}`)).j.data; ok("doctor ratingAvg/ratingCount recomputed", dd.ratingCount >= 1 && dd.ratingAvg > 0, JSON.stringify({ a: dd.ratingAvg, c: dd.ratingCount }));
const rid = r.j?.data?._id; r = await call("DELETE", `/reviews/${rid}`, A.token); ok("admin deletes review", r.s === 200 || r.s === 204, r.s);
const dd2 = (await call("GET", `/doctors/${doctor._id}`)).j.data; ok("  ...rating recomputed after delete", dd2.ratingCount === dd.ratingCount - 1, `${dd.ratingCount}->${dd2.ratingCount}`);
r = await call("PATCH", `/appointments/${a3._id}/status`, D.token, { status: "cancelled" }); ok("completed -> cancelled blocked (400)", r.s === 400, r.s);
const d4 = day(7, 4); r = await call("POST", "/appointments", P.token, { doctor: doctor._id, date: d4, startTime: "09:00" }); const a4 = r.j.data; await call("PATCH", `/appointments/${a4._id}/respond`, D.token, { action: "accept" });
r = await call("PATCH", `/appointments/${a4._id}/status`, D.token, { status: "no_show" }); ok("confirmed -> no_show", r.s === 200 && r.j.data.status === "no_show", r.s);
// cancellation window / past: need a near-term slot. Probe: patient cancels a CONFIRMED appt that starts within the window.
// Find today's/tomorrow's slot relative to the clinic offset (UTC+5 default).
const off = 300; const now = new Date(Date.now() + off * 6e4); 
// make an admin-created doctor available every day all day so we can book "now + 1h"
r = await call("POST", "/doctors", A.token, { name: "Dr Allday", email: `all${S}@c.example`, password: "Doctor@12345", specialty: cardio._id, consultationFee: 100, isApproved: true, availability: [0,1,2,3,4,5,6].map((d) => ({ dayOfWeek: d, startTime: "00:00", endTime: "23:30" })) }); const all = r.j?.data; ok("admin creates all-day doctor", r.s === 201, JSON.stringify(r.j));
r = await call("POST", "/auth/login", null, { email: `all${S}@c.example`, password: "Doctor@12345" }); const AD = r.j.data;
const soon = new Date(now.getTime() + 60 * 6e4); const sd = soon.toISOString().slice(0, 10); const mins = soon.getUTCHours() * 60 + soon.getUTCMinutes(); const st = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const slotM = Math.ceil((mins + 1) / 30) * 30;
if (slotM < 24 * 60 - 30) {
  r = await call("POST", "/appointments", P.token, { doctor: all._id, date: sd, startTime: st(slotM) }); const a5 = r.j?.data; ok("book slot ~1h from now", r.s === 201, JSON.stringify(r.j));
  r = await call("PATCH", `/appointments/${a5._id}/status`, P.token, { status: "cancelled" }); ok("patient cancels PENDING near-term appt -> 200 (window applies to confirmed only)", r.s === 200, `${r.s} ${JSON.stringify(r.j)}`);
  r = await call("POST", "/appointments", P.token, { doctor: all._id, date: sd, startTime: st(slotM) }); const a6 = r.j.data;
  await call("PATCH", `/appointments/${a6._id}/respond`, AD.token, { action: "accept" });
  r = await call("PATCH", `/appointments/${a6._id}/status`, P.token, { status: "cancelled" }); ok("patient cancel CONFIRMED within window -> 400 CANCELLATION_NOT_ALLOWED", r.s === 400 && r.j.error.code === "CANCELLATION_NOT_ALLOWED", `${r.s} ${JSON.stringify(r.j)}`);
  r = await call("PATCH", `/appointments/${a6._id}/status`, AD.token, { status: "cancelled" }); ok("doctor may still cancel inside window", r.s === 200, r.s);
} else console.log("SKIP  near-midnight: cancellation-window probe");

// ---------- availability guard & dashboards & response shapes
r = await call("PUT", `/doctors/${doctor._id}/availability`, D.token, { slotDurationMinutes: 30, availability: [{ dayOfWeek: 6, startTime: "09:00", endTime: "10:00" }] }); ok("availability change that strands bookings -> 409", r.s === 409, `${r.s} ${JSON.stringify(r.j)}`);
r = await call("PUT", `/doctors/${doctor._id}/availability`, D.token, { slotDurationMinutes: 30, availability: [{ dayOfWeek: 1, startTime: "13:00", endTime: "09:00" }] }); ok("availability end<=start -> 400", r.s === 400, r.s);
for (const [n, tk] of [["admin", A.token], ["doctor", D.token], ["patient", P.token]]) { r = await call("GET", `/dashboard/${n}`, tk); ok(`dashboard/${n} -> 200 {data}`, r.s === 200 && r.j.data && typeof r.j.data === "object", r.s); }
r = await call("GET", "/appointments?limit=2&page=1", A.token); ok("list envelope {data[], meta{page,limit,total}}", Array.isArray(r.j.data) && r.j.meta.limit === 2 && typeof r.j.meta.total === "number");
r = await call("GET", "/users", A.token); ok("users list never exposes passwordHash", !JSON.stringify(r.j).includes("passwordHash"));
r = await call("DELETE", `/specialties/${cardio._id}`, A.token); ok("deleting specialty in use by doctors is refused (4xx)", r.s >= 400 && r.s < 500, `${r.s} ${JSON.stringify(r.j)}`);
const hh = await fetch(API + "/health"); ok("security headers present, no x-powered-by", hh.headers.get("x-content-type-options") === "nosniff" && !hh.headers.get("x-powered-by"));
const pre = await fetch(API + "/auth/login", { method: "OPTIONS", headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type" } }); ok("CORS preflight allowed for configured origin", pre.headers.get("access-control-allow-origin") === "http://localhost:3000", pre.status);
const bad = await fetch(API + "/health", { headers: { Origin: "http://evil.example" } }); ok("CORS: foreign origin gets no allow-origin", !bad.headers.get("access-control-allow-origin"));
console.log(`\n${pass} passed, ${fail} failed`); if (fails.length) console.log("FAILED:", fails.join(" | ")); process.exit(fail ? 1 : 0);
