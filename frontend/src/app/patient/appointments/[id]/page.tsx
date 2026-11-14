"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CreditCard, Stethoscope } from "lucide-react";
import { Avatar, Button, Card, CardBody, CardHeader, DetailRow, ErrorState, LinkButton, PageLoader, Rating } from "@/components/ui";
import { PayModal } from "@/features/appointments/PayModal";
import { ReviewForm } from "@/features/appointments/ReviewForm";
import { PaymentBadge, StatusBadge } from "@/features/appointments/StatusBadge";
import { useStatusUpdater } from "@/features/appointments/useStatusUpdater";
import { allowedActions } from "@/features/appointments/utils";
import { useFetch } from "@/hooks/useFetch";
import { appointmentService } from "@/services";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";

export default function AppointmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: a, loading, error, reload } = useFetch(() => appointmentService.get(id), [id]);
  const { request, dialog } = useStatusUpdater("patient", reload);
  const [paying, setPaying] = useState(false);

  return (
    <>
      <Link href="/patient/appointments" className="mb-5 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"><ChevronLeft className="h-4 w-4" />My appointments</Link>
      {loading ? <PageLoader label="Loading appointment…" /> : error || !a ? <ErrorState message={error ?? "Appointment not found"} onRetry={reload} /> : (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader title="Appointment details" action={<StatusBadge status={a.status} />} />
              <CardBody>
                <dl className="divide-y divide-slate-100">
                  <DetailRow label="Date">{formatDate(a.date)}</DetailRow>
                  <DetailRow label="Time">{formatTime(a.startTime)} to {formatTime(a.endTime)}</DetailRow>
                  <DetailRow label="Reason for visit">{a.reason || "Not given"}</DetailRow>
                  <DetailRow label="Doctor's notes">{a.notes || "No notes yet"}</DetailRow>
                  <DetailRow label="Booked on">{formatDate(a.createdAt.slice(0, 10))}</DetailRow>
                </dl>
                {allowedActions("patient", a).length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    {allowedActions("patient", a).map((act) => <Button key={act.status} variant={act.variant} onClick={() => request(a, act)}>{act.label} appointment</Button>)}
                  </div>
                )}
              </CardBody>
            </Card>

            {a.status === "completed" && (
              <Card>
                <CardHeader title="Your review" />
                <CardBody>
                  {a.review ? (
                    <div className="space-y-2"><Rating value={a.review.rating} count={1} size="md" />{a.review.comment && <p className="text-sm text-ink-soft">{a.review.comment}</p>}</div>
                  ) : (
                    <><p className="mb-3 text-sm text-ink-soft">How was your visit with {a.doctor.user.name}?</p><ReviewForm appointmentId={a._id} onDone={reload} /></>
                  )}
                </CardBody>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader title="Doctor" />
              <CardBody className="space-y-4">
                <div className="flex items-center gap-3"><Avatar name={a.doctor.user.name} size="lg" /><div><p className="font-semibold text-ink">{a.doctor.user.name}</p><p className="text-sm text-ink-soft">{a.doctor.specialty.name}</p><Rating value={a.doctor.ratingAvg} count={a.doctor.ratingCount} /></div></div>
                <LinkButton href={`/doctors/${a.doctor._id}`} variant="outline" className="w-full"><Stethoscope className="h-4 w-4" />View profile</LinkButton>
              </CardBody>
            </Card>

            {a.payment && (
              <Card>
                <CardHeader title="Payment" action={<PaymentBadge status={a.payment.status} />} />
                <CardBody className="space-y-4">
                  <dl className="divide-y divide-slate-100">
                    <DetailRow label="Amount">{formatCurrency(a.payment.amount, a.payment.currency)}</DetailRow>
                    {a.payment.method && <DetailRow label="Method"><span className="capitalize">{a.payment.method}</span></DetailRow>}
                    {a.payment.transactionRef && <DetailRow label="Reference">{a.payment.transactionRef}</DetailRow>}
                    {a.payment.paidAt && <DetailRow label="Paid on">{formatDate(a.payment.paidAt.slice(0, 10))}</DetailRow>}
                  </dl>
                  {a.payment.status === "pending" && a.status !== "cancelled" && <Button className="w-full" onClick={() => setPaying(true)}><CreditCard className="h-4 w-4" />Pay now</Button>}
                  {a.payment.status === "refunded" && <p className="text-sm text-ink-soft">This payment was refunded.</p>}
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}
      {a?.payment && <PayModal open={paying} onClose={() => setPaying(false)} appointmentId={a._id} payment={a.payment} onPaid={reload} />}
      {dialog}
    </>
  );
}
