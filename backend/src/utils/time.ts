import { env } from "../config/env";

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const toMinutes = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export const toHHmm = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export const dayOfWeek = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay();

/** Current date/time in the clinic's timezone (fixed offset from UTC). */
export function clinicNow(): { date: string; minutes: number } {
  const d = new Date(Date.now() + env.TZ_OFFSET_MINUTES * 60_000);
  return { date: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

export function isPastSlot(date: string, startMinutes: number): boolean {
  const now = clinicNow();
  return date < now.date || (date === now.date && startMinutes <= now.minutes);
}

/** Minutes from now until the slot starts (negative if already started), in clinic time. */
export function minutesUntilSlot(date: string, startMinutes: number): number {
  const now = clinicNow();
  const dayDiff = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${now.date}T00:00:00Z`)) / 60_000;
  return dayDiff + startMinutes - now.minutes;
}

/** The last `n` calendar dates (clinic time) ending today, oldest first. */
export function lastNDates(n: number): string[] {
  const today = Date.parse(`${clinicNow().date}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => new Date(today - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

export interface AvailabilityWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface SlotTime {
  startTime: string;
  endTime: string;
}

/** All bookable slot times a doctor offers on a given calendar date (ignores existing bookings). */
export function generateSlots(availability: AvailabilityWindow[], slotMinutes: number, date: string): SlotTime[] {
  const dow = dayOfWeek(date);
  const out = new Map<string, SlotTime>();
  const windows = availability
    .filter((w) => w.dayOfWeek === dow)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  for (const w of windows) {
    const end = toMinutes(w.endTime);
    for (let t = toMinutes(w.startTime); t + slotMinutes <= end; t += slotMinutes) {
      const startTime = toHHmm(t);
      out.set(startTime, { startTime, endTime: toHHmm(t + slotMinutes) });
    }
  }
  return [...out.values()].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
}
