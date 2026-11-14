// End-to-end API check. Usage: API=http://localhost:5000/api node scripts/e2e.mjs  (needs seeded DB)
const API = process.env.API || "http://localhost:5000/api";
const ADMIN = { email: process.env.ADMIN_EMAIL || "admin@clinic.example", password: process.env.ADMIN_PASSWORD || "Admin@12345" };
const DOC = { email: "ayesha.khan@clinic.example", password: process.env.DOCTOR_PASSWORD || "Doctor@12345" };
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  -> " + extra}`); };
async function call(method, path, token, body) {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { s: r.status, j, h: r.headers };
}
const WEEKS = Math.floor(Math.random() * 40) * 7;
const nextWeekday = (minDaysAhead, dow = 1) => { const d = new Date(Date.now() + (minDaysAhead + WEEKS) * 864e5); while (d.getUTCDay() !== dow) d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };

const stamp = Date.now();
const pEmail = `patient${stamp}@test.example`, p2Email = `patient2_${stamp}@test.example`;

let r = await call("GET", "/health"); ok("health", r.s === 200);
r = await fetch(API + "/health", { headers: { Origin: "http://localhost:3000" } });
ok("CORS allows frontend origin", r.headers.get("access-control-allow-origin") === "http://localhost:3000", r.headers.get("access-control-allow-origin"));

// auth
r = await call("POST", "/auth/register", null, { name: "Test Patient", email: pEmail, password: "Patient@123", phone: "03001234567" });
ok("register patient", r.s === 201 && r.j?.data?.token && r.j.data.user.role === "patient", JSON.stringify(r.j));
const pTok = r.j?.data?.token;
r = await call("POST", "/auth/register", null, { name: "Other Patient", email: p2Email, password: "Patient@123" });
const p2Tok = r.j?.data?.token;
r = await call("POST", "/auth/register", null, { name: "Dup Patient", email: pEmail, password: "Patient@123" }); ok("duplicate email rejected", r.s === 409, r.s);
r = await call("POST", "/auth/login", null, { email: pEmail, password: "wrong" }); ok("bad password -> 401", r.s === 401, r.s);
r = await call("POST", "/auth/login", null, ADMIN); ok("admin login", r.s === 200 && r.j?.data?.user?.role === "admin", JSON.stringify(r.j)); const aTok = r.j?.data?.token;
r = await call("POST", "/auth/login", null, DOC); ok("doctor login", r.s === 200 && r.j?.data?.user?.role === "doctor", JSON.stringify(r.j)); const dTok = r.j?.data?.token;
r = await call("GET", "/auth/me", pTok); ok("/auth/me", r.s === 200 && r.j?.data?.user?.email === pEmail, JSON.stringify(r.j));
r = await call("GET", "/auth/me"); ok("no token -> 401", r.s === 401, r.s);
r = await call("GET", "/auth/me", "garbage"); ok("bad token -> 401", r.s === 401, r.s);

// RBAC
r = await call("GET", "/users", pTok); ok("patient cannot list users (403)", r.s === 403, r.s);
r = await call("GET", "/users", aTok); ok("admin lists users", r.s === 200 && Array.isArray(r.j?.data), r.s);
r = await call("GET", "/dashboard/admin", dTok); ok("doctor cannot open admin dashboard", r.s === 403, r.s);
r = await call("POST", "/specialties", pTok, { name: "Nope" }); ok("patient cannot create specialty", r.s === 403, r.s);

// specialties + doctors
r = await call("GET", "/specialties"); ok("list specialties", r.s === 200 && r.j.data.length >= 8, r.s);
const cardio = r.j.data.find((s) => s.name === "Cardiology");
r = await call("POST", "/specialties", aTok, { name: "Test Spec " + stamp, description: "tmp" }); ok("admin creates specialty", r.s === 201, JSON.stringify(r.j)); const specId = r.j?.data?._id;
r = await call("PATCH", `/specialties/${specId}`, aTok, { isActive: false }); ok("admin updates specialty", r.s === 200, r.s);
r = await call("DELETE", `/specialties/${specId}`, aTok); ok("admin deletes specialty", r.s === 200 || r.s === 204, r.s);
r = await call("GET", "/doctors"); ok("list doctors (public)", r.s === 200 && r.j.data.length >= 6, r.j?.data?.length);
r = await call("GET", `/doctors?specialty=${cardio._id}`); ok("filter doctors by specialty id", r.s === 200 && r.j.data.length >= 1 && r.j.data.every((d) => d.specialty._id === cardio._id), JSON.stringify(r.j).slice(0, 200));
r = await call("GET", "/doctors?q=Ayesha"); ok("search doctors by name", r.s === 200 && r.j.data.length === 1, r.j?.data?.length);
const doctor = (await call("GET", "/doctors?q=Ayesha")).j.data[0];
r = await call("GET", `/doctors/${doctor._id}`); ok("doctor detail", r.s === 200 && r.j.data._id === doctor._id, r.s);
r = await call("GET", "/doctors/me", dTok); ok("doctor /me", r.s === 200 && r.j.data._id === doctor._id, r.s);

// slots + booking
const date = nextWeekday(4, 1), startTime = "09:00";
r = await call("GET", `/doctors/${doctor._id}/slots?date=${date}`); ok("slots for Monday", r.s === 200 && r.j.data.slots?.some((s) => s.startTime === startTime), JSON.stringify(r.j).slice(0, 250));
r = await call("POST", "/appointments", pTok, { doctor: doctor._id, date, startTime, reason: "Checkup" }); ok("book appointment", r.s === 201 && r.j.data.status === "pending", JSON.stringify(r.j)); const appt = r.j?.data;
ok("payment record auto-created (pending)", appt?.payment?.status === "pending", JSON.stringify(appt?.payment));
r = await call("POST", "/appointments", p2Tok, { doctor: doctor._id, date, startTime }); ok("double booking -> 409", r.s === 409, `${r.s} ${JSON.stringify(r.j)}`);
r = await call("POST", "/appointments", pTok, { doctor: doctor._id, date, startTime: "20:00" }); ok("slot outside availability -> 400", r.s === 400, r.s);
r = await call("POST", "/appointments", pTok, { doctor: doctor._id, date: "2020-01-06", startTime }); ok("past slot -> 400", r.s === 400, r.s);
r = await call("POST", "/appointments", dTok, { doctor: doctor._id, date, startTime: "09:30" }); ok("doctor cannot book (403)", r.s === 403, r.s);
r = await call("GET", `/appointments/${appt._id}`, p2Tok); ok("other patient cannot read appointment (403)", r.s === 403, r.s);
r = await call("GET", "/appointments", pTok); ok("patient lists own appts", r.s === 200 && r.j.data.length === 1, r.j?.data?.length);
r = await call("GET", "/appointments", dTok); ok("doctor sees appt", r.s === 200 && r.j.data.some((a) => a._id === appt._id), r.s);

// doctor accepts, patient pays, patient cancels -> refund
r = await call("PATCH", `/appointments/${appt._id}/status`, pTok, { status: "confirmed" }); ok("patient cannot confirm (403)", r.s === 403, r.s);
r = await call("PATCH", `/appointments/${appt._id}/status`, dTok, { status: "confirmed" }); ok("doctor confirms", r.s === 200 && r.j.data.status === "confirmed", JSON.stringify(r.j));
r = await call("POST", `/payments/${appt._id}/pay`, p2Tok, { method: "card" }); ok("other patient cannot pay (403/404)", [403, 404].includes(r.s), r.s);
r = await call("POST", `/payments/${appt._id}/pay`, pTok, { method: "card", transactionRef: "TX123" }); ok("pay appointment", r.s === 200 && r.j.data.status === "paid", JSON.stringify(r.j));
r = await call("POST", `/payments/${appt._id}/pay`, pTok, { method: "card" }); ok("double pay rejected", r.s >= 400 && r.s < 500, r.s);
r = await call("PATCH", `/appointments/${appt._id}/status`, pTok, { status: "cancelled" }); ok("patient cancels paid appt", r.s === 200 && r.j.data.status === "cancelled", JSON.stringify(r.j));
ok("cancel auto-refunds payment", r.j?.data?.payment?.status === "refunded", JSON.stringify(r.j?.data?.payment));
r = await call("POST", "/appointments", p2Tok, { doctor: doctor._id, date, startTime }); ok("cancelled slot can be rebooked", r.s === 201, `${r.s} ${JSON.stringify(r.j)}`); const appt2 = r.j?.data;
r = await call("PATCH", `/appointments/${appt2._id}/status`, dTok, { status: "cancelled" }); ok("doctor cancels unpaid (no refund needed)", r.s === 200 && r.j.data.payment?.status !== "refunded", JSON.stringify(r.j?.data?.payment));
r = await call("PATCH", `/appointments/${appt._id}/status`, dTok, { status: "confirmed" }); ok("cancelled -> confirmed blocked", r.s === 400, r.s);

// full flow: respond, pay, complete, review
const date3 = nextWeekday(5, 2);
r = await call("POST", "/appointments", pTok, { doctor: doctor._id, date: date3, startTime: "10:00", reason: "Follow-up" }); const appt3 = r.j?.data; ok("book 2nd appointment", r.s === 201, JSON.stringify(r.j));
r = await call("PATCH", `/appointments/${appt3._id}/respond`, dTok, { action: "accept" }); ok("doctor accepts via /respond", r.s === 200 && r.j.data.status === "confirmed", JSON.stringify(r.j));
r = await call("POST", "/reviews", pTok, { appointment: appt3._id, rating: 5, comment: "Great" }); ok("review before completion rejected", r.s >= 400 && r.s < 500, r.s);
r = await call("POST", `/payments/${appt3._id}/pay`, pTok, { method: "online" }); ok("pay 2nd", r.s === 200, r.s);
r = await call("PATCH", `/appointments/${appt3._id}/status`, dTok, { status: "completed", notes: "All good" }); ok("doctor completes", r.s === 200 && r.j.data.status === "completed", JSON.stringify(r.j));
r = await call("POST", "/reviews", pTok, { appointment: appt3._id, rating: 5, comment: "Great doctor" }); ok("review after completion", r.s === 201, JSON.stringify(r.j));
r = await call("POST", "/reviews", pTok, { appointment: appt3._id, rating: 4 }); ok("duplicate review rejected", r.s === 409 || r.s === 400, r.s);
r = await call("GET", `/doctors/${doctor._id}/reviews`); ok("doctor reviews list", r.s === 200 && r.j.data.length >= 1, r.s);
r = await call("GET", `/doctors/${doctor._id}`); ok("doctor rating updated", r.j?.data?.ratingCount >= 1 || r.j?.data?.averageRating > 0, JSON.stringify({ a: r.j?.data?.averageRating, c: r.j?.data?.ratingCount }));
r = await call("PATCH", `/appointments/${appt3._id}/status`, pTok, { status: "cancelled" }); ok("cannot cancel completed", r.s === 400, r.s);

// admin
r = await call("GET", "/payments", aTok); ok("admin lists payments", r.s === 200, r.s);
r = await call("GET", "/appointments?status=completed", aTok); ok("admin filters appts", r.s === 200 && r.j.data.length >= 1, r.s);
r = await call("PATCH", "/users/me", pTok, { name: "Renamed Patient", phone: "03111234567" }); ok("patient updates profile", r.s === 200 && r.j.data.name === "Renamed Patient", JSON.stringify(r.j));
const newDocEmail = `newdoc${stamp}@clinic.example`;
r = await call("POST", "/doctors", aTok, { name: "Dr New", email: newDocEmail, password: "Doctor@12345", specialty: cardio._id, consultationFee: 1000, isApproved: false }); ok("admin creates doctor", r.s === 201, JSON.stringify(r.j)); const nd = r.j?.data;
r = await call("GET", "/doctors"); ok("unapproved doctor hidden from public", !r.j.data.some((d) => d._id === nd?._id));
r = await call("PATCH", `/doctors/${nd?._id}/approve`, aTok, { isApproved: true }); ok("admin approves doctor", r.s === 200 && r.j.data.isApproved === true, r.s);
r = await call("POST", "/appointments", pTok, { doctor: doctor._id, date: nextWeekday(6, 3), startTime: "11:00" }); const live = r.j?.data; ok("book Wednesday slot for availability guard", r.s === 201, JSON.stringify(r.j));
r = await call("PUT", `/doctors/${doctor._id}/availability`, dTok, { slotDurationMinutes: 30, availability: [{ dayOfWeek: 1, startTime: "09:00", endTime: "13:00" }] });
ok("availability change blocked when it strands bookings", r.s === 409, `${r.s} ${JSON.stringify(r.j)}`);
const origAvail = doctor.availability;
r = await call("PUT", `/doctors/${doctor._id}/availability`, dTok, { slotDurationMinutes: 30, availability: origAvail }); ok("availability update that keeps bookings valid", r.s === 200, `${r.s} ${JSON.stringify(r.j)}`);
await call("PATCH", `/appointments/${live?._id}/status`, dTok, { status: "cancelled" });

// dashboards
for (const [n, t] of [["admin", aTok], ["doctor", dTok], ["patient", pTok]]) { r = await call("GET", `/dashboard/${n}`, t); ok(`${n} dashboard`, r.s === 200 && r.j?.data, `${r.s} ${JSON.stringify(r.j)}`.slice(0, 200)); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
