"use client";
import Link from "next/link";
import { CalendarCheck, CalendarClock, CheckCircle2, Clock, CalendarPlus } from "lucide-react";
import { Avatar, Card, CardBody, CardHeader, EmptyState, ErrorState, LinkButton, PageHeader, PageLoader, StatCard } from "@/components/ui";
import { StatusBadge } from "@/features/appointments/StatusBadge";
import { byStartAsc, byStartDesc, isUpcoming } from "@/features/appointments/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import { useFetch } from "@/hooks/useFetch";
import { appointmentService } from "@/services";
import { formatDate, formatTime, todayStr } from "@/lib/utils";

export default function PatientOverview() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(() => appointmentService.list(), []);
  const all = data?.data ?? [];
  const today = todayStr();
  const upcoming = all.filter((a) => isUpcoming(a, today)).sort(byStartAsc);
  const recent = [...all].sort(byStartDesc).slice(0, 5);
  const next = upcoming[0];

  return (
    <>
      <PageHeader title={`Hello, ${user?.name.split(" ")[0]}`} description="Here's what's coming up and what needs your attention."
        action={<LinkButton href="/patient/book"><CalendarPlus className="h-4 w-4" />Book appointment</LinkButton>} />
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Upcoming" value={upcoming.length} icon={<CalendarClock className="h-5 w-5" />} tone="brand" />
            <StatCard label="Awaiting confirmation" value={all.filter((a) => a.status === "pending").length} icon={<Clock className="h-5 w-5" />} tone="amber" />
            <StatCard label="Completed visits" value={all.filter((a) => a.status === "completed").length} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
            <StatCard label="Unpaid" value={all.filter((a) => a.payment?.status === "pending" && a.status !== "cancelled").length} icon={<CalendarCheck className="h-5 w-5" />} tone="teal" hint="Appointments with a balance" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <Card>
              <CardHeader title="Next appointment" />
              <CardBody>
                {next ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3"><Avatar name={next.doctor.user.name} size="lg" /><div><p className="font-semibold text-ink">{next.doctor.user.name}</p><p className="text-sm text-ink-soft">{next.doctor.specialty.name}</p></div></div>
                    <div className="rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-accent-50 p-4"><p className="font-semibold text-navy">{formatDate(next.date)}</p><p className="text-sm text-brand-800">{formatTime(next.startTime)} to {formatTime(next.endTime)}</p></div>
                    <div className="flex items-center justify-between"><StatusBadge status={next.status} /><Link href={`/patient/appointments/${next._id}`} className="text-sm font-medium text-brand-700 hover:underline">View details</Link></div>
                  </div>
                ) : <EmptyState title="Nothing scheduled" description="Book a visit to see it here." action={<LinkButton href="/patient/book" size="sm">Find a time</LinkButton>} />}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Recent appointments" action={<Link href="/patient/appointments" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>} />
              {recent.length === 0 ? <CardBody><EmptyState title="No appointments yet" description="Your booking history will appear here." /></CardBody> : (
                <ul className="divide-y divide-slate-100">
                  {recent.map((a) => (
                    <li key={a._id}>
                      <Link href={`/patient/appointments/${a._id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-brand-50/50">
                        <div className="flex min-w-0 items-center gap-3"><Avatar name={a.doctor.user.name} size="sm" /><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{a.doctor.user.name}</p><p className="text-xs text-ink-soft">{formatDate(a.date)} · {formatTime(a.startTime)}</p></div></div>
                        <StatusBadge status={a.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
