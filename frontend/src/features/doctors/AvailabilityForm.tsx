"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Card, CardBody, CardHeader, Select, useToast } from "@/components/ui";
import { getErrorMessage } from "@/lib/axios";
import { doctorService } from "@/services";
import { DAYS, cn } from "@/lib/utils";
import type { Doctor } from "@/types";

const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

const day = z.object({ dayOfWeek: z.number(), enabled: z.boolean(), startTime: z.string().min(1, "Required"), endTime: z.string().min(1, "Required") })
  .refine((d) => !d.enabled || d.endTime > d.startTime, { path: ["endTime"], message: "End must be after start" });
const schema = z.object({
  slotDurationMinutes: z.number().min(10).max(120),
  days: z.array(day).length(7),
}).refine((v) => v.days.some((d) => d.enabled), { path: ["days"], message: "Turn on at least one working day" });
type Values = z.infer<typeof schema>;

export function AvailabilityForm({ doctor, onSaved }: { doctor: Doctor; onSaved: () => void }) {
  const toast = useToast();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      slotDurationMinutes: doctor.slotDurationMinutes,
      days: ORDER.map((dow) => {
        const a = doctor.availability.find((x) => x.dayOfWeek === dow);
        return { dayOfWeek: dow, enabled: !!a, startTime: a?.startTime ?? "09:00", endTime: a?.endTime ?? "17:00" };
      }),
    },
  });
  const days = watch("days");

  const onSubmit = handleSubmit(async (v) => {
    try {
      await doctorService.update(doctor._id, {
        slotDurationMinutes: v.slotDurationMinutes,
        availability: v.days.filter((d) => d.enabled).map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })),
      });
      toast.success("Availability saved"); onSaved();
    } catch (e) { toast.error(getErrorMessage(e)); }
  });

  const rootError = (errors.days as { message?: string } | undefined)?.message;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader title="Weekly working hours" description="Patients can only book inside these hours." />
        <CardBody className="space-y-3">
          {rootError && <Alert>{rootError}</Alert>}
          {ORDER.map((dow, i) => {
            const on = days?.[i]?.enabled;
            return (
              <div key={dow} className={cn("grid items-start gap-3 rounded-lg border p-3 sm:grid-cols-[160px_1fr_1fr]", on ? "border-brand-200 bg-brand-50/40" : "border-slate-200")}>
                <label className="flex h-10 items-center gap-3 text-sm font-medium text-ink">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" {...register(`days.${i}.enabled`)} />
                  {DAYS[dow]}
                </label>
                <div>
                  <label className="sr-only" htmlFor={`start-${dow}`}>{DAYS[dow]} start time</label>
                  <input id={`start-${dow}`} type="time" disabled={!on} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-100 disabled:text-ink-mute focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" {...register(`days.${i}.startTime`)} />
                </div>
                <div>
                  <label className="sr-only" htmlFor={`end-${dow}`}>{DAYS[dow]} end time</label>
                  <input id={`end-${dow}`} type="time" disabled={!on} aria-invalid={!!errors.days?.[i]?.endTime} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-100 disabled:text-ink-mute focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" {...register(`days.${i}.endTime`)} />
                  {errors.days?.[i]?.endTime && <p role="alert" className="mt-1 text-sm text-red-600">{errors.days[i]!.endTime!.message}</p>}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Visit length" />
        <CardBody>
          <Select label="Each appointment lasts" wrapperClassName="max-w-xs" {...register("slotDurationMinutes", { valueAsNumber: true })}>
            {[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </Select>
        </CardBody>
      </Card>
      <div className="flex justify-end"><Button type="submit" size="lg" loading={isSubmitting} disabled={!isDirty}>Save availability</Button></div>
    </form>
  );
}
