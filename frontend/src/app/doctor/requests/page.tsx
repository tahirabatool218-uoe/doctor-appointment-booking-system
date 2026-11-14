"use client";
import { ClipboardCheck } from "lucide-react";
import { Card, EmptyState, ErrorState, PageHeader, PageLoader } from "@/components/ui";
import { AppointmentsTable } from "@/features/appointments/AppointmentsTable";
import { useStatusUpdater } from "@/features/appointments/useStatusUpdater";
import { byStartAsc } from "@/features/appointments/utils";
import { useFetch } from "@/hooks/useFetch";
import { appointmentService } from "@/services";

export default function RequestsPage() {
  const { data, loading, error, reload } = useFetch(() => appointmentService.list({ status: "pending" }), []);
  const { request, dialog } = useStatusUpdater("doctor", reload);
  const rows = [...(data?.data ?? [])].sort(byStartAsc);
  return (
    <>
      <PageHeader title="Appointment requests" description="Accept or decline new bookings. Patients are notified of your decision." />
      <Card>
        {loading ? <PageLoader /> : error ? <div className="p-5"><ErrorState message={error} onRetry={reload} /></div>
          : rows.length === 0 ? <div className="p-5"><EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title="No pending requests" description="You're all caught up. New requests will appear here." /></div>
          : <AppointmentsTable appointments={rows} viewer="doctor" onAction={request} showPayment />}
      </Card>
      {dialog}
    </>
  );
}
