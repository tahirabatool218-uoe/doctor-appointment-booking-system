"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, CalendarSearch, ShieldCheck, Search, Star, Stethoscope, Clock3 } from "lucide-react";
import { Avatar, Button, LinkButton, Rating, Select, Skeleton } from "@/components/ui";
import { DoctorCard, DoctorCardSkeleton } from "@/features/doctors/DoctorCard";
import { useFetch } from "@/hooks/useFetch";
import { doctorService, specialtyService } from "@/services";
import { formatCurrency } from "@/lib/utils";

const steps = [
  { icon: CalendarSearch, title: "Search", text: "Filter by specialty or name and compare experience, fees and patient ratings." },
  { icon: Clock3, title: "Pick a time", text: "See open slots for the day you want. Slots already taken never appear." },
  { icon: CalendarCheck, title: "Confirm and pay", text: "Book in under a minute, then pay online or at the clinic." },
];
const quotes = [
  { name: "Zainab Tariq", text: "I booked a dermatologist on my lunch break and was seen two days later. No phone calls, no waiting on hold.", doc: "Dr. Imran Malik" },
  { name: "Ali Khan", text: "Dr. Ahmed explained every result clearly. The reminders and clear status updates made the visit stress-free.", doc: "Dr. Sarah Ahmed" },
  { name: "Sana Javed", text: "Finding a neurologist who actually had free slots this week used to take days. Here it took minutes.", doc: "Dr. Bilal Chaudhry" },
];

export default function HomePage() {
  const router = useRouter();
  const [spec, setSpec] = useState("");
  const [q, setQ] = useState("");
  const specialties = useFetch(() => specialtyService.list(), []);
  const featured = useFetch(() => doctorService.list({ limit: 100 }), []);
  const top = featured.data?.data.slice(0, 3) ?? [];

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (spec) p.set("specialty", spec);
    if (q.trim()) p.set("q", q.trim());
    router.push(`/doctors${p.toString() ? `?${p}` : ""}`);
  };

  return (
    <>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-tint via-white to-mist">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-20">
          <div>
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-navy sm:text-5xl">
              See the right doctor this week, not next month.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">
              Browse approved specialists, check their real open slots and book in under a minute. Every appointment is tracked from request to follow-up.
            </p>
            <form onSubmit={search} className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-panel sm:grid-cols-[1fr_1fr_auto]" role="search">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Doctor name or condition" aria-label="Doctor name or condition"
                  className="h-11 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
              </div>
              <Select aria-label="Specialty" value={spec} onChange={(e) => setSpec(e.target.value)} className="!h-11">
                <option value="">All specialties</option>
                {specialties.data?.filter((s) => s.isActive).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </Select>
              <Button type="submit" size="lg" className="h-11">Find doctors</Button>
            </form>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-soft">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent-600" />Every doctor is reviewed by an admin</span>
              <span className="inline-flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" />Ratings only from completed visits</span>
            </div>
          </div>

          {/* Live availability panel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Top-rated doctors</h2>
              <Link href="/doctors" className="text-sm font-medium text-brand-700 hover:underline">See all</Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {featured.loading
                ? [0, 1, 2].map((i) => <li key={i} className="flex gap-3 py-3"><Skeleton className="h-10 w-10 !rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div></li>)
                : top.map((d) => (
                    <li key={d._id} className="flex items-center gap-3 py-3">
                      <Avatar name={d.user.name} />
                      <div className="min-w-0 flex-1">
                        <Link href={`/doctors/${d._id}`} className="block truncate text-sm font-semibold text-ink hover:text-brand-700">{d.user.name}</Link>
                        <p className="text-xs text-ink-soft">{d.specialty.name} · {formatCurrency(d.consultationFee)}</p>
                      </div>
                      <Rating value={d.ratingAvg} count={d.ratingCount} />
                    </li>
                  ))}
            </ul>
            <LinkButton href="/doctors" variant="secondary" className="mt-3 w-full">Check availability</LinkButton>
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-semibold text-navy">Care for every need</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">Choose a specialty to see doctors who are accepting appointments now.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {specialties.loading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            : specialties.data?.filter((s) => s.isActive).map((s) => (
                <Link key={s._id} href={`/doctors?specialty=${s._id}`} className="group rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift">
                  <span className="mb-3 inline-flex rounded-lg bg-accent-50 p-2 text-accent-600"><Stethoscope className="h-5 w-5" /></span>
                  <h3 className="font-semibold text-ink group-hover:text-brand-800">{s.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{s.description}</p>
                </Link>
              ))}
        </div>
      </section>

      {/* How it works: genuine sequence */}
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold">Book in three steps</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 shadow-md shadow-brand-900/40"><s.icon className="h-5 w-5" /></span>
                <div><h3 className="font-semibold">Step {i + 1}: {s.title}</h3><p className="mt-1 text-sm text-slate-300">{s.text}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Featured doctors */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl font-semibold text-navy">Meet our doctors</h2>
          <Link href="/doctors" className="text-sm font-medium text-brand-700 hover:underline">Browse all doctors</Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.loading ? [0, 1, 2].map((i) => <DoctorCardSkeleton key={i} />) : top.map((d) => <DoctorCard key={d._id} doctor={d} />)}
        </div>
      </section>

      {/* Patient stories */}
      <section className="border-y border-slate-200 bg-tint/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold text-navy">What patients say</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {quotes.map((t) => (
              <figure key={t.name} className="rounded-xl border border-slate-200 bg-white p-6 shadow-panel">
                <blockquote className="text-sm leading-relaxed text-ink-soft">“{t.text}”</blockquote>
                <figcaption className="mt-4 flex items-center gap-3"><Avatar name={t.name} size="sm" /><div><p className="text-sm font-semibold text-ink">{t.name}</p><p className="text-xs text-ink-mute">Seen by {t.doc}</p></div></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-gradient-to-r from-brand-600 to-accent-600 p-8 text-white shadow-lift sm:flex-row sm:items-center sm:p-12">
          <div><h2 className="font-display text-3xl font-semibold">Ready to book your first visit?</h2><p className="mt-2 text-brand-50">Create a free account and manage all your appointments in one place.</p></div>
          <div className="flex gap-3"><LinkButton href="/register" variant="outline" size="lg">Create account</LinkButton><LinkButton href="/doctors" variant="secondary" size="lg">Browse doctors</LinkButton></div>
        </div>
      </section>
    </>
  );
}
