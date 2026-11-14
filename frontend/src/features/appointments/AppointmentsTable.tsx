"use client";
import Link from "next/link";
import { Avatar, Button, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/utils";
import type { Appointment, Role } from "@/types";
import { PaymentBadge, StatusBadge } from "./StatusBadge";
import { allowedActions, type StatusAction } from "./utils";

interface Props {
  appointments: Appointment[];
  viewer: Role;
  onAction: (a: Appointment, action: StatusAction) => void;
  showPayment?: boolean;
}

export function AppointmentsTable({ appointments, viewer, onAction, showPayment = true }: Props) {
  const actions = (a: Appointment) => (
    <>
      {viewer === "patient" && <Link href={`/patient/appointments/${a._id}`} className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-sm font-medium transition-colors hover:border-brand-300 hover:bg-brand-50/60">Details</Link>}
      {allowedActions(viewer, a).map((act) => <Button key={act.status} size="sm" variant={act.variant} onClick={() => onAction(a, act)}>{act.label}</Button>)}
    </>
  );

  return (
    <>
    {/* Mobile: appointment cards */}
    <ul className="divide-y divide-slate-100 md:hidden">
      {appointments.map((a) => {
        const person = viewer === "patient" ? { name: a.doctor.user.name, sub: a.doctor.specialty.name } : { name: a.patient.name, sub: a.patient.phone ?? a.patient.email };
        return (
          <li key={a._id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-semibold text-navy">{formatDate(a.date)}</p><p className="text-xs text-ink-soft">{formatTime(a.startTime)} to {formatTime(a.endTime)}</p></div>
              <StatusBadge status={a.status} />
            </div>
            <div className="flex items-center gap-3"><Avatar name={person.name} size="sm" /><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{person.name}</p><p className="truncate text-xs text-ink-soft">{person.sub}</p></div></div>
            {viewer === "admin" && <p className="text-xs text-ink-soft">Doctor: <span className="font-medium text-ink">{a.doctor.user.name}</span></p>}
            {a.reason && <p className="line-clamp-2 text-sm text-ink-soft">{a.reason}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {showPayment ? (a.payment ? <PaymentBadge status={a.payment.status} /> : <span className="text-xs text-ink-mute">No payment</span>) : <span />}
              <div className="flex flex-wrap justify-end gap-2">{actions(a)}</div>
            </div>
          </li>
        );
      })}
    </ul>
    {/* Tablet and up: table */}
    <div className="hidden md:block">
    <Table>
      <THead>
        <tr>
          <Th>When</Th>
          {viewer !== "patient" && <Th>Patient</Th>}
          {viewer !== "doctor" && <Th>Doctor</Th>}
          <Th>Reason</Th><Th>Status</Th>{showPayment && <Th>Payment</Th>}<Th className="text-right">Actions</Th>
        </tr>
      </THead>
      <TBody>
        {appointments.map((a) => (
          <Tr key={a._id}>
            <Td><p className="font-medium">{formatDate(a.date)}</p><p className="text-xs text-ink-soft">{formatTime(a.startTime)} to {formatTime(a.endTime)}</p></Td>
            {viewer !== "patient" && <Td><div className="flex items-center gap-2"><Avatar name={a.patient.name} size="sm" /><div><p className="font-medium">{a.patient.name}</p><p className="text-xs text-ink-soft">{a.patient.phone ?? a.patient.email}</p></div></div></Td>}
            {viewer !== "doctor" && <Td><p className="font-medium">{a.doctor.user.name}</p><p className="text-xs text-ink-soft">{a.doctor.specialty.name}</p></Td>}
            <Td className="max-w-[220px]"><p className="line-clamp-2 text-ink-soft">{a.reason || "Not given"}</p></Td>
            <Td><StatusBadge status={a.status} /></Td>
            {showPayment && <Td>{a.payment ? <PaymentBadge status={a.payment.status} /> : "None"}</Td>}
            <Td>
              <div className="flex flex-wrap justify-end gap-2">
                {viewer === "patient" && <Link href={`/patient/appointments/${a._id}`} className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-sm font-medium transition-colors hover:border-brand-300 hover:bg-brand-50/60">Details</Link>}
                {allowedActions(viewer, a).map((act) => <Button key={act.status} size="sm" variant={act.variant} onClick={() => onAction(a, act)}>{act.label}</Button>)}
              </div>
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
    </div>
    </>
  );
}
