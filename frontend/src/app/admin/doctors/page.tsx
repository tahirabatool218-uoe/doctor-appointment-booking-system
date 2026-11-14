"use client";
import { useMemo, useState } from "react";
import { Plus, Stethoscope } from "lucide-react";
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, PageHeader, PageLoader, Rating, Select, Table, TBody, Td, Th, THead, Tr, useToast } from "@/components/ui";
import { DoctorFormModal } from "@/features/doctors/DoctorFormModal";
import { useFetch } from "@/hooks/useFetch";
import { getErrorMessage } from "@/lib/axios";
import { doctorService, specialtyService } from "@/services";
import { formatCurrency } from "@/lib/utils";
import type { Doctor } from "@/types";

export default function AdminDoctorsPage() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "approved" | "pending">("");
  const [modal, setModal] = useState<{ doctor: Doctor | null } | null>(null);
  const doctors = useFetch(() => doctorService.list({ includeUnapproved: true }), []);
  const specialties = useFetch(() => specialtyService.list(), []);

  const rows = useMemo(() => (doctors.data?.data ?? []).filter((d) =>
    (!status || (status === "approved") === d.isApproved) && (!q.trim() || `${d.user.name} ${d.user.email} ${d.specialty.name}`.toLowerCase().includes(q.trim().toLowerCase()))), [doctors.data, q, status]);

  const approve = async (d: Doctor) => {
    try { await doctorService.approve(d._id, !d.isApproved); toast.success(d.isApproved ? "Doctor hidden from patients" : "Doctor approved and now bookable"); doctors.reload(); } catch (e) { toast.error(getErrorMessage(e)); }
  };

  return (
    <>
      <PageHeader title="Manage doctors" description="Create doctor accounts and approve who patients can book." action={<Button onClick={() => setModal({ doctor: null })} disabled={!specialties.data?.length}><Plus className="h-4 w-4" />Add doctor</Button>} />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or specialty" aria-label="Search doctors"
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:w-72" />
          <Select aria-label="Filter by approval" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} wrapperClassName="w-full sm:w-44">
            <option value="">All doctors</option><option value="approved">Approved</option><option value="pending">Pending approval</option>
          </Select>
        </div>
        {doctors.loading ? <PageLoader /> : doctors.error ? <div className="p-5"><ErrorState message={doctors.error} onRetry={doctors.reload} /></div>
          : rows.length === 0 ? <div className="p-5"><EmptyState icon={<Stethoscope className="h-6 w-6" />} title="No doctors found" description="Adjust the filters or add a doctor." /></div>
          : (
            <Table>
              <THead><tr><Th>Doctor</Th><Th>Specialty</Th><Th>Fee</Th><Th>Rating</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></THead>
              <TBody>{rows.map((d) => (
                <Tr key={d._id}>
                  <Td><div className="flex items-center gap-3"><Avatar name={d.user.name} size="sm" /><div><p className="font-medium">{d.user.name}</p><p className="text-xs text-ink-soft">{d.user.email}</p></div></div></Td>
                  <Td>{d.specialty.name}</Td>
                  <Td>{formatCurrency(d.consultationFee)}</Td>
                  <Td><Rating value={d.ratingAvg} count={d.ratingCount} /></Td>
                  <Td><Badge tone={d.isApproved ? "green" : "amber"}>{d.isApproved ? "Approved" : "Pending"}</Badge></Td>
                  <Td><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setModal({ doctor: d })}>Edit</Button><Button size="sm" variant={d.isApproved ? "outline" : "primary"} onClick={() => approve(d)}>{d.isApproved ? "Revoke" : "Approve"}</Button></div></Td>
                </Tr>))}</TBody>
            </Table>
          )}
      </Card>
      {modal && <DoctorFormModal open doctor={modal.doctor} specialties={specialties.data ?? []} onClose={() => setModal(null)} onSaved={doctors.reload} />}
    </>
  );
}
