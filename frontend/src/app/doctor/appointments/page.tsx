"use client";
import { PageHeader } from "@/components/ui";
import { AppointmentsManager } from "@/features/appointments/AppointmentsManager";

export default function DoctorAppointmentsPage() {
  return (
    <>
      <PageHeader title="Appointments" description="Confirm visits, mark them completed or no-show, and add notes for patients." />
      <AppointmentsManager role="doctor" />
    </>
  );
}
