"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Award, Briefcase, ChevronLeft, Clock, GraduationCap } from "lucide-react";
import { Avatar, Badge, Card, CardBody, CardHeader, EmptyState, ErrorState, LinkButton, PageLoader, Rating } from "@/components/ui";
import { AvailabilityList } from "@/features/doctors/AvailabilityList";
import { useAuth } from "@/features/auth/AuthProvider";
import { useFetch } from "@/hooks/useFetch";
import { doctorService } from "@/services";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function DoctorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const doctor = useFetch(() => doctorService.get(id), [id]);
  const reviews = useFetch(() => doctorService.reviews(id), [id]);
  const d = doctor.data;
  const bookHref = `/patient/book?doctor=${id}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/doctors" className="mb-5 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"><ChevronLeft className="h-4 w-4" />All doctors</Link>
      {doctor.loading ? <PageLoader label="Loading doctor profile…" />
        : doctor.error || !d ? <ErrorState message={doctor.error ?? "Doctor not found"} onRetry={doctor.reload} />
        : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <Card>
                <CardBody className="flex flex-col gap-5 sm:flex-row">
                  <Avatar name={d.user.name} size="xl" />
                  <div>
                    <h1 className="font-display text-3xl font-semibold text-navy">{d.user.name}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-3"><Badge tone="brand">{d.specialty.name}</Badge><Rating value={d.ratingAvg} count={d.ratingCount} size="md" />{!d.isApproved && <Badge tone="amber">Pending approval</Badge>}</div>
                    <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink-soft">
                      <div className="inline-flex items-center gap-2"><Briefcase className="h-4 w-4" />{d.experienceYears} years experience</div>
                      <div className="inline-flex items-center gap-2"><Clock className="h-4 w-4" />{d.slotDurationMinutes}-minute visits</div>
                    </dl>
                  </div>
                </CardBody>
              </Card>

              <Card><CardHeader title="About" /><CardBody><p className="text-sm leading-relaxed text-ink-soft">{d.bio || "This doctor hasn't added a bio yet."}</p></CardBody></Card>

              <Card>
                <CardHeader title="Qualifications" />
                <CardBody>
                  {d.qualifications.length === 0 ? <p className="text-sm text-ink-soft">Not listed.</p> : (
                    <ul className="space-y-3">{d.qualifications.map((q) => <li key={q} className="flex gap-3 text-sm text-ink"><GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{q}</li>)}</ul>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Patient reviews" description={d.ratingCount ? `${d.ratingCount} review${d.ratingCount > 1 ? "s" : ""} from completed visits` : undefined} />
                <CardBody>
                  {reviews.loading ? <PageLoader label="Loading reviews…" />
                    : reviews.error ? <ErrorState message={reviews.error} onRetry={reviews.reload} />
                    : !reviews.data?.data.length ? <EmptyState icon={<Award className="h-6 w-6" />} title="No reviews yet" description="Reviews appear after patients complete a visit." />
                    : <ul className="divide-y divide-slate-100">{reviews.data.data.map((r) => (
                        <li key={r._id} className="py-4 first:pt-0 last:pb-0">
                          <div className="flex items-center justify-between"><span className="text-sm font-semibold text-ink">{r.patient.name}</span><span className="text-xs text-ink-mute">{formatDate(r.createdAt.slice(0, 10))}</span></div>
                          <Rating value={r.rating} count={1} />
                          {r.comment && <p className="mt-1.5 text-sm text-ink-soft">{r.comment}</p>}
                        </li>))}</ul>}
                </CardBody>
              </Card>
            </div>

            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <Card>
                <CardBody className="space-y-4">
                  <div><p className="text-sm text-ink-soft">Consultation fee</p><p className="text-3xl font-semibold text-ink">{formatCurrency(d.consultationFee)}</p></div>
                  {user && user.role !== "patient"
                    ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-ink-soft">Only patient accounts can book appointments.</p>
                    : user ? <LinkButton href={bookHref} size="lg" className="w-full">Book appointment</LinkButton>
                    : <><LinkButton href={`/login?next=${encodeURIComponent(bookHref)}`} size="lg" className="w-full">Sign in to book</LinkButton><p className="text-center text-sm text-ink-soft">New here? <Link href="/register" className="font-medium text-brand-700 hover:underline">Create an account</Link></p></>}
                </CardBody>
              </Card>
              <Card><CardHeader title="Weekly hours" /><CardBody><AvailabilityList availability={d.availability} /></CardBody></Card>
            </aside>
          </div>
        )}
    </div>
  );
}
