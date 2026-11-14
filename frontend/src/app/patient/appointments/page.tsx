"use client";
import { CalendarPlus } from "lucide-react";
import { LinkButton, PageHeader } from "@/components/ui";
import { AppointmentsManager } from "@/features/appointments/AppointmentsManager";

export default function MyAppointmentsPage() {
  return (
    <>
      <PageHeader title="My appointments" description="Track, pay for and cancel your bookings." action={<LinkButton href="/patient/book"><CalendarPlus className="h-4 w-4" />Book appointment</LinkButton>} />
      <AppointmentsManager role="patient" />
    </>
  );
}
