"use client";
import Link from "next/link";
import { CalendarDays, ClipboardList, Star, Users } from "lucide-react";
import { Avatar, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoader, Rating, StatCard } from "@/components/ui";
import { Button } from "@/components/ui";
import { StatusBadge } from "@/features/appointments/StatusBadge";
import { useStatusUpdater } from "@/features/appointments/useStatusUpdater";
import { allowedActions, byStartAsc } from "@/features/appointments/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMyDoctor } from "@/features/doctors/useMyDoctor";
import { useFetch } from "@/hooks/useFetch";
import { appointmentService } from "@/services";
import { formatDate, formatTime, todayStr } from "@/lib/utils";

export default function DoctorOverview() {
  const { user } = useAuth();
  const me = useMyDoctor();
  const { data, loading, error, reload } = useFetch(() => appointmentService.list(), []);
  const { request, dialog } = useStatusUpdater("doctor", reload);
  const all = data?.data ?? [];
  const today = todayStr();
  const todays = all.filter((a) => a.date === today && a.status !== "cancelled").sort(byStartAsc);
  const pending = all.filter((a) => a.status === "pending").sort(byStartAsc);
  const patients = new Set(all.filter((a) => a.status !== "cancelled").map((a) => a.patient._id)).size;

  return (
    <>
      <PageHeader title={`Good day, ${user?.name.replace(/^Dr\.?\s+/i, "Dr. ")}`} description={me.data ? `${me.data.specialty.name} · ${me.data.isApproved ? "Approved profile" : "Profile awaiting admin approval"}` : undefined} />
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Today's appointments" value={todays.length} icon={<CalendarDays className="h-5 w-5" />} tone="brand" />
            <StatCard label="Awaiting your response" value={pending.length} icon={<ClipboardList className="h-5 w-5" />} tone="amber" />
            <StatCard label="Patients seen or booked" value={patients} icon={<Users className="h-5 w-5" />} tone="teal" />
            <StatCard label="Patient rating" value={me.data?.ratingCount ? me.data.ratingAvg.toFixed(1) : "New"} icon={<Star className="h-5 w-5" />} tone="amber" hint={me.data?.ratingCount ? `${me.data.ratingCount} reviews` : "No reviews yet"} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Today's schedule" description={formatDate(today)} />
              {todays.length === 0 ? <div className="p-5"><EmptyState title="No appointments today" description="Enjoy the quiet, or check your availability." /></div> : (
                <ul className="divide-y divide-slate-100">{todays.map((a) => (
                  <li key={a._id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex items-center gap-3"><Avatar name={a.patient.name} size="sm" /><div><p className="text-sm font-medium text-ink">{a.patient.name}</p><p className="text-xs text-ink-soft">{formatTime(a.startTime)} · {a.reason || "No reason given"}</p></div></div>
                    <StatusBadge status={a.status} />
                  </li>))}</ul>
              )}
            </Card>
            <Card>
              <CardHeader title="Requests to review" action={<Link href="/doctor/requests" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>} />
              {pending.length === 0 ? <div className="p-5"><EmptyState title="All caught up" description="New booking requests will show up here." /></div> : (
                <ul className="divide-y divide-slate-100">{pending.slice(0, 4).map((a) => (
                  <li key={a._id} className="space-y-2 px-5 py-3">
                    <div className="flex items-center justify-between"><p className="text-sm font-medium text-ink">{a.patient.name}</p><span className="text-xs text-ink-soft">{formatDate(a.date)} · {formatTime(a.startTime)}</span></div>
                    <div className="flex gap-2">{allowedActions("doctor", a).map((act) => <Button key={act.status} size="sm" variant={act.variant} onClick={() => request(a, act)}>{act.label}</Button>)}</div>
                  </li>))}</ul>
              )}
            </Card>
          </div>
          {me.data && <p className="text-sm text-ink-soft">Your public rating: <Rating value={me.data.ratingAvg} count={me.data.ratingCount} /></p>}
        </div>
      )}
      {dialog}
    </>
  );
}
