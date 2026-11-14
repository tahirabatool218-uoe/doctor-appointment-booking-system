import type { Appointment, AppointmentStatus, PaymentStatus, Role } from "@/types";
import type { Tone } from "@/components/ui";

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "Pending", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled", no_show: "No-show",
};
export const STATUS_TONE: Record<AppointmentStatus, Tone> = {
  pending: "amber", confirmed: "blue", completed: "green", cancelled: "red", no_show: "slate",
};
export const PAYMENT_TONE: Record<PaymentStatus, Tone> = { pending: "amber", paid: "green", failed: "red", refunded: "teal" };

export interface StatusAction { status: Exclude<AppointmentStatus, "pending">; label: string; variant: "primary" | "outline" | "danger" }

export function allowedActions(role: Role, appt: Pick<Appointment, "status">): StatusAction[] {
  const staff = role !== "patient";
  if (appt.status === "pending") {
    return staff
      ? [{ status: "confirmed", label: "Accept", variant: "primary" }, { status: "cancelled", label: "Decline", variant: "danger" }]
      : [{ status: "cancelled", label: "Cancel", variant: "danger" }];
  }
  if (appt.status === "confirmed") {
    return staff
      ? [{ status: "completed", label: "Mark completed", variant: "primary" }, { status: "no_show", label: "No-show", variant: "outline" }, { status: "cancelled", label: "Cancel", variant: "danger" }]
      : [{ status: "cancelled", label: "Cancel", variant: "danger" }];
  }
  return [];
}

const stamp = (a: Appointment) => `${a.date}T${a.startTime}`;
export const byStartAsc = (a: Appointment, b: Appointment) => stamp(a).localeCompare(stamp(b));
export const byStartDesc = (a: Appointment, b: Appointment) => stamp(b).localeCompare(stamp(a));
export const isUpcoming = (a: Appointment, today: string) => (a.status === "pending" || a.status === "confirmed") && a.date >= today;
