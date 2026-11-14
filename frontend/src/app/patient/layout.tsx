"use client";
import { RoleGuard } from "@/features/auth/RoleGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { patientNav } from "@/components/layout/nav";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="patient">
      <DashboardShell nav={patientNav} roleLabel="Patient">{children}</DashboardShell>
    </RoleGuard>
  );
}
