"use client";
import { ErrorState, PageHeader, PageLoader } from "@/components/ui";
import { ProfileForm } from "@/features/auth/ProfileForm";
import { DoctorProfileForm } from "@/features/doctors/DoctorProfileForm";
import { useMyDoctor } from "@/features/doctors/useMyDoctor";

export default function DoctorProfilePage() {
  const { data, loading, error, reload } = useMyDoctor();
  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your account and what patients see on your public page." />
      <ProfileForm />
      {loading ? <PageLoader /> : error || !data ? <ErrorState message={error ?? "Doctor profile not found"} onRetry={reload} />
        : <DoctorProfileForm key={data.consultationFee + data.experienceYears + (data.bio ?? "")} doctor={data} onSaved={reload} />}
    </div>
  );
}
