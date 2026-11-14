"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge, Button, Card, CardBody, CardHeader, Input, Textarea, useToast } from "@/components/ui";
import { getErrorMessage } from "@/lib/axios";
import { doctorService } from "@/services";
import type { Doctor } from "@/types";

const schema = z.object({
  bio: z.string().max(800, "Keep your bio under 800 characters").optional(),
  qualifications: z.string().max(600).optional(),
  experienceYears: z.number({ invalid_type_error: "Enter a number" }).int("Whole years only").min(0).max(60),
  consultationFee: z.number({ invalid_type_error: "Enter a number" }).min(0, "Fee can't be negative").max(100000),
});
type Values = z.infer<typeof schema>;

export function DoctorProfileForm({ doctor, onSaved }: { doctor: Doctor; onSaved: () => void }) {
  const toast = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { bio: doctor.bio ?? "", qualifications: doctor.qualifications.join("\n"), experienceYears: doctor.experienceYears, consultationFee: doctor.consultationFee },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await doctorService.update(doctor._id, {
        bio: v.bio?.trim() ?? "", experienceYears: v.experienceYears, consultationFee: v.consultationFee,
        qualifications: (v.qualifications ?? "").split("\n").map((q) => q.trim()).filter(Boolean),
      });
      toast.success("Professional profile saved"); onSaved();
    } catch (e) { toast.error(getErrorMessage(e)); }
  });
  return (
    <Card>
      <CardHeader title="Professional profile" description="Shown on your public page." action={<Badge tone="brand">{doctor.specialty.name}</Badge>} />
      <CardBody>
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
          <Input label="Years of experience" type="number" min={0} error={errors.experienceYears?.message} {...register("experienceYears", { valueAsNumber: true })} />
          <Input label="Consultation fee (PKR)" type="number" min={0} step={100} error={errors.consultationFee?.message} {...register("consultationFee", { valueAsNumber: true })} />
          <Textarea label="Bio" wrapperClassName="sm:col-span-2" placeholder="Describe your focus areas and approach to care" error={errors.bio?.message} {...register("bio")} />
          <Textarea label="Qualifications" wrapperClassName="sm:col-span-2" hint="One per line." error={errors.qualifications?.message} {...register("qualifications")} />
          <div className="sm:col-span-2"><Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save changes</Button></div>
        </form>
      </CardBody>
    </Card>
  );
}
