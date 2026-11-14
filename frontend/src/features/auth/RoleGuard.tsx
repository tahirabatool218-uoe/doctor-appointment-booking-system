"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui";
import type { Role } from "@/types";
import { homeFor, useAuth } from "./AuthProvider";

export function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (user.role !== role) router.replace(homeFor(user.role));
  }, [loading, user, role, router, pathname]);

  if (loading || !user || user.role !== role) return <div className="p-8"><PageLoader label="Checking your session…" /></div>;
  return <>{children}</>;
}
