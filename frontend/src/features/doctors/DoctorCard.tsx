import Link from "next/link";
import { Briefcase } from "lucide-react";
import { Avatar, Badge, LinkButton, Rating } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import type { Doctor } from "@/types";

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
      <div className="flex items-start gap-4">
        <Avatar name={doctor.user.name} size="lg" />
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ink">
            <Link href={`/doctors/${doctor._id}`} className="hover:text-brand-700">{doctor.user.name}</Link>
          </h3>
          <Badge tone="brand" className="mt-1">{doctor.specialty.name}</Badge>
          <div className="mt-2"><Rating value={doctor.ratingAvg} count={doctor.ratingCount} /></div>
        </div>
      </div>
      <p className="mt-4 line-clamp-2 text-sm text-ink-soft">{doctor.bio}</p>
      <div className="mt-4 flex items-center justify-between text-sm text-ink-soft">
        <span className="inline-flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{doctor.experienceYears} yrs experience</span>
        <span className="font-semibold text-ink">{formatCurrency(doctor.consultationFee)}</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <LinkButton href={`/doctors/${doctor._id}`} variant="outline" size="sm">View profile</LinkButton>
        <LinkButton href={`/patient/book?doctor=${doctor._id}`} size="sm">Book now</LinkButton>
      </div>
    </article>
  );
}

export function DoctorCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex gap-4"><div className="h-14 w-14 rounded-full bg-slate-200" /><div className="flex-1 space-y-2"><div className="h-4 w-2/3 rounded bg-slate-200" /><div className="h-4 w-1/3 rounded bg-slate-200" /></div></div>
      <div className="mt-4 space-y-2"><div className="h-3 rounded bg-slate-200" /><div className="h-3 w-5/6 rounded bg-slate-200" /></div>
      <div className="mt-6 h-8 rounded bg-slate-200" />
    </div>
  );
}
