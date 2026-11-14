"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SearchX } from "lucide-react";
import { Button, EmptyState, ErrorState, Select } from "@/components/ui";
import { DoctorCard, DoctorCardSkeleton } from "@/features/doctors/DoctorCard";
import { useFetch } from "@/hooks/useFetch";
import { doctorService, specialtyService } from "@/services";

function DoctorsList() {
  const router = useRouter();
  const params = useSearchParams();
  const specialty = params.get("specialty") ?? "";
  const q = params.get("q") ?? "";
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);

  const specialties = useFetch(() => specialtyService.list(), []);
  const doctors = useFetch(() => doctorService.list({ specialty: specialty || undefined, q: q || undefined }), [specialty, q]);

  const update = (next: { specialty?: string; q?: string }) => {
    const p = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    router.replace(`/doctors${p.toString() ? `?${p}` : ""}`);
  };
  const list = doctors.data?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold text-navy">Find a doctor</h1>
      <p className="mt-1 text-ink-soft">Only admin-approved doctors are listed.</p>

      <form role="search" onSubmit={(e) => { e.preventDefault(); update({ q: text.trim() }); }} className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-panel sm:grid-cols-[1fr_220px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by name or condition" aria-label="Search doctors"
            className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
        <Select aria-label="Specialty" value={specialty} onChange={(e) => update({ specialty: e.target.value })}>
          <option value="">All specialties</option>
          {specialties.data?.filter((s) => s.isActive).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </Select>
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-6" aria-live="polite">
        {!doctors.loading && !doctors.error && <p className="mb-4 text-sm text-ink-soft">{list.length} doctor{list.length === 1 ? "" : "s"} found</p>}
        {doctors.error ? <ErrorState message={doctors.error} onRetry={doctors.reload} />
          : doctors.loading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <DoctorCardSkeleton key={i} />)}</div>
          : list.length === 0 ? <EmptyState icon={<SearchX className="h-6 w-6" />} title="No doctors match your search" description="Try a different name or choose another specialty." action={<Button variant="outline" onClick={() => { setText(""); router.replace("/doctors"); }}>Clear filters</Button>} />
          : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map((d) => <DoctorCard key={d._id} doctor={d} />)}</div>}
      </div>
    </div>
  );
}

export default function DoctorsPage() {
  return <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10"><DoctorCardSkeleton /></div>}><DoctorsList /></Suspense>;
}
