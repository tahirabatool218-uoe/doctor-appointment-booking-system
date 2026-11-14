"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarX } from "lucide-react";
import { Alert, Avatar, Button, Card, CardBody, CardHeader, DetailRow, EmptyState, Input, PageLoader, Select, Textarea, useToast } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { getErrorMessage } from "@/lib/axios";
import { appointmentService, doctorService, specialtyService } from "@/services";
import { addDays, cn, formatCurrency, formatDate, formatTime, todayStr } from "@/lib/utils";

const schema = z.object({
  specialty: z.string().optional(),
  doctor: z.string().min(1, "Choose a doctor"),
  date: z.string().min(1, "Choose a date").refine((d) => d >= todayStr(), "Choose today or a future date"),
  startTime: z.string().min(1, "Pick a time slot"),
  reason: z.string().max(300, "Keep it under 300 characters").optional(),
});
type Values = z.infer<typeof schema>;

export function BookingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const specialties = useFetch(() => specialtyService.list(), []);
  const doctors = useFetch(() => doctorService.list(), []);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { specialty: "", doctor: params.get("doctor") ?? "", date: todayStr(), startTime: "", reason: "" },
  });
  const [specialty, doctorId, date, startTime] = watch(["specialty", "doctor", "date", "startTime"]);

  const allDocs = doctors.data?.data ?? [];
  const visibleDocs = useMemo(() => allDocs.filter((d) => !specialty || d.specialty._id === specialty), [allDocs, specialty]);
  const doctor = allDocs.find((d) => d._id === doctorId);

  // Align specialty filter with a pre-selected doctor
  useEffect(() => { if (doctor && !specialty) setValue("specialty", doctor.specialty._id); }, [doctor]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setValue("startTime", ""); }, [doctorId, date, setValue]);

  const slots = useFetch(() => doctorService.slots(doctorId, date), [doctorId, date], !!doctorId && !!date && date >= todayStr());
  const available = slots.data?.slots.filter((s) => s.available) ?? [];

  const onSubmit = handleSubmit(async (v) => {
    setSubmitError(null);
    try {
      const appt = await appointmentService.create({ doctor: v.doctor, date: v.date, startTime: v.startTime, reason: v.reason?.trim() || undefined });
      toast.success("Appointment requested. The doctor will confirm shortly.");
      router.push(`/patient/appointments/${appt._id}`);
    } catch (e) { setSubmitError(getErrorMessage(e)); slots.reload(); setValue("startTime", ""); }
  });

  if (doctors.loading || specialties.loading) return <PageLoader label="Loading doctors…" />;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Choose a doctor" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Select label="Specialty" {...register("specialty", { onChange: () => setValue("doctor", "") })}>
              <option value="">All specialties</option>
              {specialties.data?.filter((s) => s.isActive).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </Select>
            <Select label="Doctor" error={errors.doctor?.message} {...register("doctor")}>
              <option value="">Select a doctor</option>
              {visibleDocs.map((d) => <option key={d._id} value={d._id}>{d.user.name} ({d.specialty.name})</option>)}
            </Select>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Pick a date and time" description={doctor ? `${doctor.slotDurationMinutes}-minute visits` : "Select a doctor first"} />
          <CardBody className="space-y-4">
            <Input type="date" label="Date" min={todayStr()} max={addDays(60)} error={errors.date?.message} wrapperClassName="max-w-xs" {...register("date")} />
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Available times</p>
              {!doctorId ? <p className="text-sm text-ink-soft">Choose a doctor to see open slots.</p>
                : slots.loading ? <PageLoader label="Checking availability…" />
                : slots.error ? <Alert>{slots.error}</Alert>
                : available.length === 0 ? <EmptyState icon={<CalendarX className="h-6 w-6" />} title="No open slots on this day" description="This doctor isn't working that day or is fully booked. Try another date." />
                : (
                  <div role="radiogroup" aria-label="Available times" className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {slots.data!.slots.map((s) => (
                      <button key={s.startTime} type="button" role="radio" aria-checked={startTime === s.startTime} disabled={!s.available}
                        onClick={() => setValue("startTime", s.startTime, { shouldValidate: true })}
                        className={cn("rounded-lg border px-2 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 disabled:line-through",
                          startTime === s.startTime ? "border-brand-600 bg-brand-600 text-white shadow-sm" : "border-slate-300 bg-white text-ink hover:border-brand-500")}>
                        {formatTime(s.startTime)}
                      </button>
                    ))}
                  </div>
                )}
              {errors.startTime && <p role="alert" className="mt-2 text-sm text-red-600">{errors.startTime.message}</p>}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Reason for visit" description="Optional, but it helps the doctor prepare." />
          <CardBody><Textarea aria-label="Reason for visit" placeholder="Describe your symptoms or what you'd like to discuss" error={errors.reason?.message} {...register("reason")} /></CardBody>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader title="Booking summary" />
          <CardBody className="space-y-4">
            {doctor ? (
              <>
                <div className="flex items-center gap-3"><Avatar name={doctor.user.name} /><div><p className="font-semibold text-ink">{doctor.user.name}</p><p className="text-sm text-ink-soft">{doctor.specialty.name}</p></div></div>
                <dl className="divide-y divide-slate-100 border-y border-slate-100">
                  <DetailRow label="Date">{date ? formatDate(date) : "Not chosen"}</DetailRow>
                  <DetailRow label="Time">{startTime ? formatTime(startTime) : "Not chosen"}</DetailRow>
                  <DetailRow label="Fee">{formatCurrency(doctor.consultationFee)}</DetailRow>
                </dl>
              </>
            ) : <p className="text-sm text-ink-soft">Your selection will appear here.</p>}
            {submitError && <Alert>{submitError}</Alert>}
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Request appointment</Button>
            <p className="text-xs text-ink-mute">You can pay after booking. Free cancellation until the doctor confirms.</p>
          </CardBody>
        </Card>
      </aside>
    </form>
  );
}
