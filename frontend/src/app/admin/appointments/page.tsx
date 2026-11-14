"use client";
import { PageHeader } from "@/components/ui";
import { AppointmentsManager } from "@/features/appointments/AppointmentsManager";

export default function AdminAppointmentsPage() {
  return (
    <>
      <PageHeader title="Manage appointments" description="Review every booking, step in to confirm or cancel, and check payment status." />
      <AppointmentsManager role="admin" />
    </>
  );
}
