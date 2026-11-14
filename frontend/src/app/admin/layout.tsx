"use client";
import { RoleGuard } from "@/features/auth/RoleGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { adminNav } from "@/components/layout/nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="admin">
      <DashboardShell nav={adminNav} roleLabel="Admin">{children}</DashboardShell>
    </RoleGuard>
  );
}
