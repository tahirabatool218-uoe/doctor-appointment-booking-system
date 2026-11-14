"use client";
import { useMemo, useState } from "react";
import { CalendarX } from "lucide-react";
import { Card, EmptyState, ErrorState, LinkButton, PageLoader } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { appointmentService } from "@/services";
import { todayStr } from "@/lib/utils";
import type { AppointmentStatus, Role } from "@/types";
import { AppointmentsTable } from "./AppointmentsTable";
import { StatusTabs } from "./StatusTabs";
import { useStatusUpdater } from "./useStatusUpdater";
import { byStartAsc, byStartDesc, isUpcoming } from "./utils";

type Filter = "all" | "upcoming" | AppointmentStatus;

export function AppointmentsManager({ role, emptyAction }: { role: Role; emptyAction?: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const { data, loading, error, reload } = useFetch(() => appointmentService.list(), []);
  const { request, dialog } = useStatusUpdater(role, reload);
  const today = todayStr();
  const all = data?.data ?? [];

  const tabs: { value: Filter; label: string; count: number }[] = useMemo(() => [
    { value: "all", label: "All", count: all.length },
    { value: "upcoming", label: "Upcoming", count: all.filter((a) => isUpcoming(a, today)).length },
    { value: "pending", label: "Pending", count: all.filter((a) => a.status === "pending").length },
    { value: "completed", label: "Completed", count: all.filter((a) => a.status === "completed").length },
    { value: "cancelled", label: "Cancelled", count: all.filter((a) => a.status === "cancelled").length },
  ], [all, today]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = all.filter((a) => (filter === "all" ? true : filter === "upcoming" ? isUpcoming(a, today) : a.status === filter));
    if (term) list = list.filter((a) => [a.patient.name, a.doctor.user.name, a.doctor.specialty.name, a.reason ?? ""].some((s) => s.toLowerCase().includes(term)));
    return [...list].sort(filter === "upcoming" ? byStartAsc : byStartDesc);
  }, [all, filter, q, today]);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-2 sm:pr-4">
        <StatusTabs tabs={tabs} value={filter} onChange={setFilter} />
        {role !== "patient" && (
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or reason" aria-label="Search appointments"
            className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:w-60" />
        )}
      </div>
      {loading ? <PageLoader label="Loading appointments…" />
        : error ? <div className="p-5"><ErrorState message={error} onRetry={reload} /></div>
        : rows.length === 0 ? (
          <div className="p-5"><EmptyState icon={<CalendarX className="h-6 w-6" />} title={all.length ? "Nothing matches this filter" : "No appointments yet"}
            description={all.length ? "Try another tab or clear the search." : role === "patient" ? "Book your first appointment with an approved doctor." : "Appointments will appear here as patients book."}
            action={role === "patient" && emptyAction !== false && !all.length ? <LinkButton href="/patient/book">Book appointment</LinkButton> : undefined} /></div>
        ) : <AppointmentsTable appointments={rows} viewer={role} onAction={request} />}
      {dialog}
    </Card>
  );
}
