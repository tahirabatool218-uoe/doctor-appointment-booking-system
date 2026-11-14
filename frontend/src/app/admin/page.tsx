"use client";
import Link from "next/link";
import { CalendarCheck, Stethoscope, Users, Wallet } from "lucide-react";
import { Avatar, Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoader, StatCard, useToast } from "@/components/ui";
import { StatusBadge } from "@/features/appointments/StatusBadge";
import { STATUS_LABEL, byStartDesc } from "@/features/appointments/utils";
import { useFetch } from "@/hooks/useFetch";
import { getErrorMessage } from "@/lib/axios";
import { appointmentService, doctorService, userService } from "@/services";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import type { AppointmentStatus } from "@/types";

const BAR: Record<AppointmentStatus, string> = { pending: "bg-amber-500", confirmed: "bg-brand-500", completed: "bg-green-600", cancelled: "bg-red-600", no_show: "bg-slate-400" };

export default function AdminOverview() {
  const toast = useToast();
  const users = useFetch(() => userService.list(), []);
  const doctors = useFetch(() => doctorService.list({ includeUnapproved: true }), []);
  const appts = useFetch(() => appointmentService.list(), []);
  const loading = users.loading || doctors.loading || appts.loading;
  const error = users.error ?? doctors.error ?? appts.error;
  const reload = () => { users.reload(); doctors.reload(); appts.reload(); };

  const a = appts.data?.data ?? [];
  const docs = doctors.data?.data ?? [];
  const pendingDocs = docs.filter((d) => !d.isApproved);
  const revenue = a.reduce((s, x) => s + (x.payment?.status === "paid" ? x.payment.amount : 0), 0);
  const statuses = (["pending", "confirmed", "completed", "cancelled", "no_show"] as AppointmentStatus[]).map((s) => ({ s, n: a.filter((x) => x.status === s).length }));
  const max = Math.max(1, ...statuses.map((x) => x.n));

  const approve = async (id: string) => {
    try { await doctorService.approve(id, true); toast.success("Doctor approved"); doctors.reload(); } catch (e) { toast.error(getErrorMessage(e)); }
  };

  return (
    <>
      <PageHeader title="Admin overview" description="Platform activity at a glance." />
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Registered users" value={users.data!.meta.total} icon={<Users className="h-5 w-5" />} tone="brand" />
            <StatCard label="Doctors" value={docs.length} icon={<Stethoscope className="h-5 w-5" />} tone="teal" hint={`${pendingDocs.length} awaiting approval`} />
            <StatCard label="Appointments" value={a.length} icon={<CalendarCheck className="h-5 w-5" />} tone="brand" />
            <StatCard label="Revenue collected" value={formatCurrency(revenue)} icon={<Wallet className="h-5 w-5" />} tone="green" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Appointments by status" />
              <ul className="space-y-3 p-5">
                {statuses.map(({ s, n }) => (
                  <li key={s} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-ink-soft">{STATUS_LABEL[s]}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-3 rounded-full transition-all duration-500 ${BAR[s]}`} style={{ width: `${(n / max) * 100}%` }} /></div>
                    <span className="w-6 text-right font-medium text-ink">{n}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Doctors awaiting approval" action={<Link href="/admin/doctors" className="text-sm font-medium text-brand-700 hover:underline">Manage doctors</Link>} />
              {pendingDocs.length === 0 ? <div className="p-5"><EmptyState title="No pending approvals" description="New doctor profiles will appear here." /></div> : (
                <ul className="divide-y divide-slate-100">{pendingDocs.map((d) => (
                  <li key={d._id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex items-center gap-3"><Avatar name={d.user.name} size="sm" /><div><p className="text-sm font-medium text-ink">{d.user.name}</p><p className="text-xs text-ink-soft">{d.specialty.name}</p></div></div>
                    <Button size="sm" onClick={() => approve(d._id)}>Approve</Button>
                  </li>))}</ul>
              )}
            </Card>
          </div>
          <Card>
            <CardHeader title="Latest appointments" action={<Link href="/admin/appointments" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>} />
            <ul className="divide-y divide-slate-100">{[...a].sort(byStartDesc).slice(0, 6).map((x) => (
              <li key={x._id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span className="font-medium text-ink">{x.patient.name} <span className="font-normal text-ink-soft">with {x.doctor.user.name}</span></span>
                <span className="flex items-center gap-3"><span className="text-ink-soft">{formatDate(x.date)} · {formatTime(x.startTime)}</span><StatusBadge status={x.status} /></span>
              </li>))}</ul>
          </Card>
        </div>
      )}
    </>
  );
}
