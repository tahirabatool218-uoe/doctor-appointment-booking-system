"use client";
import { RoleGuard } from "@/features/auth/RoleGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { doctorNav } from "@/components/layout/nav";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="doctor">
      <DashboardShell nav={doctorNav} roleLabel="Doctor">{children}</DashboardShell>
    </RoleGuard>
  );
}
