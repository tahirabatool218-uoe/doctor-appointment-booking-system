"use client";
import { PageHeader } from "@/components/ui";
import { ProfileForm } from "@/features/auth/ProfileForm";

export default function PatientProfilePage() {
  return (<><PageHeader title="Profile" description="Keep your contact details up to date." /><ProfileForm /></>);
}
