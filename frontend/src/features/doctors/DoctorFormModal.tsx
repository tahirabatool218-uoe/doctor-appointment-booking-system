"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { getErrorMessage } from "@/lib/axios";
import { doctorService } from "@/services";
import type { Doctor, Specialty } from "@/types";

const base = {
  specialty: z.string().min(1, "Choose a specialty"),
  consultationFee: z.number({ invalid_type_error: "Enter a fee" }).min(0, "Fee can't be negative").max(100000),
  experienceYears: z.number({ invalid_type_error: "Enter a number" }).int().min(0).max(60),
  bio: z.string().max(800).optional(),
};
const createSchema = z.object({
  name: z.string().trim().min(2, "Enter the doctor's full name"),
  email: z.string().min(1, "Enter an email").email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
  isApproved: z.boolean(),
  ...base,
});
const editSchema = z.object(base);
type CreateValues = z.infer<typeof createSchema>;

export function DoctorFormModal({ open, doctor, specialties, onClose, onSaved }: {
  open: boolean; doctor: Doctor | null; specialties: Specialty[]; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const editing = !!doctor;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateValues>({
    resolver: zodResolver(editing ? (editSchema as unknown as typeof createSchema) : createSchema),
    defaultValues: doctor
      ? { specialty: doctor.specialty._id, consultationFee: doctor.consultationFee, experienceYears: doctor.experienceYears, bio: doctor.bio ?? "" }
      : { name: "", email: "", password: "", isApproved: true, specialty: "", consultationFee: 2000, experienceYears: 0, bio: "" },
  });

  const submit = handleSubmit(async (v) => {
    try {
      if (doctor) {
        await doctorService.update(doctor._id, { specialty: v.specialty, consultationFee: v.consultationFee, experienceYears: v.experienceYears, bio: v.bio?.trim() ?? "" });
        toast.success("Doctor updated");
      } else {
        await doctorService.create({ name: v.name, email: v.email, password: v.password, specialty: v.specialty, consultationFee: v.consultationFee, experienceYears: v.experienceYears, bio: v.bio?.trim() || undefined, isApproved: v.isApproved });
        toast.success("Doctor account created");
      }
      onSaved(); onClose();
    } catch (e) { toast.error(getErrorMessage(e)); }
  });

  return (
    <Modal open={open} onClose={onClose} size="lg" title={editing ? `Edit ${doctor!.user.name}` : "Add doctor"}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={isSubmitting} onClick={submit}>{editing ? "Save changes" : "Create doctor"}</Button></>}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {!editing && (
          <>
            <Input label="Full name" placeholder="Dr. Full Name" error={errors.name?.message} {...register("name")} />
            <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
            <Input label="Temporary password" type="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} wrapperClassName="sm:col-span-2" />
          </>
        )}
        <Select label="Specialty" error={errors.specialty?.message} {...register("specialty")}>
          <option value="">Select a specialty</option>
          {specialties.filter((s) => s.isActive || s._id === doctor?.specialty._id).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </Select>
        <Input label="Consultation fee (PKR)" type="number" min={0} step={100} error={errors.consultationFee?.message} {...register("consultationFee", { valueAsNumber: true })} />
        <Input label="Years of experience" type="number" min={0} error={errors.experienceYears?.message} {...register("experienceYears", { valueAsNumber: true })} />
        {!editing && <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" {...register("isApproved")} />Approve immediately</label>}
        <Textarea label="Bio" wrapperClassName="sm:col-span-2" error={errors.bio?.message} {...register("bio")} />
      </form>
    </Modal>
  );
}
