"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Tags } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Input, Modal, PageHeader, PageLoader, Table, TBody, Td, Textarea, Th, THead, Tr, useToast } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { getErrorMessage } from "@/lib/axios";
import { specialtyService } from "@/services";
import type { Specialty } from "@/types";

const schema = z.object({ name: z.string().trim().min(2, "Enter at least 2 characters").max(60), description: z.string().max(200, "Keep it under 200 characters").optional() });
type Values = z.infer<typeof schema>;

function SpecialtyModal({ open, specialty, onClose, onSaved }: { open: boolean; specialty: Specialty | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: specialty?.name ?? "", description: specialty?.description ?? "" } });
  const submit = handleSubmit(async (v) => {
    try {
      if (specialty) await specialtyService.update(specialty._id, v); else await specialtyService.create(v);
      toast.success(specialty ? "Specialty updated" : "Specialty added"); onSaved(); onClose();
    } catch (e) { toast.error(getErrorMessage(e)); }
  });
  return (
    <Modal open={open} onClose={onClose} title={specialty ? "Edit specialty" : "Add specialty"} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={isSubmitting} onClick={submit}>{specialty ? "Save changes" : "Add specialty"}</Button></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Input label="Name" error={errors.name?.message} {...register("name")} />
        <Textarea label="Description" error={errors.description?.message} {...register("description")} />
      </form>
    </Modal>
  );
}

export default function AdminSpecialtiesPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => specialtyService.list(), []);
  const [editing, setEditing] = useState<Specialty | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Specialty | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = async (s: Specialty) => {
    try { await specialtyService.update(s._id, { isActive: !s.isActive }); toast.success(s.isActive ? "Specialty hidden from patients" : "Specialty visible to patients"); reload(); } catch (e) { toast.error(getErrorMessage(e)); }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try { await specialtyService.remove(deleting._id); toast.success("Specialty deleted"); setDeleting(null); reload(); } catch (e) { toast.error(getErrorMessage(e)); setDeleting(null); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Manage specialties" description="Specialties group doctors in search and booking." action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add specialty</Button>} />
      <Card>
        {loading ? <PageLoader /> : error ? <div className="p-5"><ErrorState message={error} onRetry={reload} /></div>
          : !data?.length ? <div className="p-5"><EmptyState icon={<Tags className="h-6 w-6" />} title="No specialties yet" description="Add your first specialty so doctors can be listed." action={<Button onClick={() => setAdding(true)}>Add specialty</Button>} /></div>
          : (
            <Table>
              <THead><tr><Th>Name</Th><Th>Description</Th><Th>Visibility</Th><Th className="text-right">Actions</Th></tr></THead>
              <TBody>{data.map((s) => (
                <Tr key={s._id}>
                  <Td className="font-medium">{s.name}</Td>
                  <Td className="max-w-sm text-ink-soft">{s.description || "None"}</Td>
                  <Td><Badge tone={s.isActive ? "green" : "slate"}>{s.isActive ? "Visible" : "Hidden"}</Badge></Td>
                  <Td><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEditing(s)}>Edit</Button><Button size="sm" variant="outline" onClick={() => toggle(s)}>{s.isActive ? "Hide" : "Show"}</Button><Button size="sm" variant="danger" onClick={() => setDeleting(s)}>Delete</Button></div></Td>
                </Tr>))}</TBody>
            </Table>
          )}
      </Card>
      {adding && <SpecialtyModal open specialty={null} onClose={() => setAdding(false)} onSaved={reload} />}
      {editing && <SpecialtyModal open specialty={editing} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog open={!!deleting} danger loading={busy} title="Delete specialty?" confirmLabel="Delete" message={`"${deleting?.name}" will be removed permanently. Specialties that doctors still use can't be deleted: hide them instead.`} onClose={() => setDeleting(null)} onConfirm={remove} />
    </>
  );
}
