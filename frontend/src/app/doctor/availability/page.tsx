"use client";
import { ErrorState, PageHeader, PageLoader } from "@/components/ui";
import { AvailabilityForm } from "@/features/doctors/AvailabilityForm";
import { useMyDoctor } from "@/features/doctors/useMyDoctor";

export default function AvailabilityPage() {
  const { data, loading, error, reload } = useMyDoctor();
  return (
    <>
      <PageHeader title="Availability" description="Set the days and hours patients can book you." />
      {loading ? <PageLoader /> : error || !data ? <ErrorState message={error ?? "Doctor profile not found"} onRetry={reload} />
        : <AvailabilityForm key={JSON.stringify(data.availability) + data.slotDurationMinutes} doctor={data} onSaved={reload} />}
    </>
  );
}
