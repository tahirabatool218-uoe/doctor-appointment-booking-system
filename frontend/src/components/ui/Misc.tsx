import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { cn, initials } from "@/lib/utils";

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const s = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg", xl: "h-24 w-24 text-3xl" }[size];
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 4;
  const bg = ["bg-brand-100 text-brand-800", "bg-accent-100 text-accent-800", "bg-slate-200 text-slate-700", "bg-amber-100 text-amber-800"][hue];
  return <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", s, bg, className)}>{initials(name)}</span>;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const statTones = {
  brand: "bg-brand-50 text-brand-600",
  teal: "bg-accent-50 text-accent-600",
  green: "bg-green-50 text-green-600",
  amber: "bg-amber-50 text-amber-600",
} as const;

export function StatCard({ label, value, icon, hint, tone = "brand" }: { label: string; value: ReactNode; icon: ReactNode; hint?: string; tone?: keyof typeof statTones }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className={cn("rounded-xl p-3", statTones[tone])}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-ink-soft">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-navy">{value}</p>
        {hint && <p className="text-xs text-ink-mute">{hint}</p>}
      </div>
    </div>
  );
}

export function Rating({ value, count, size = "sm" }: { value: number; count?: number; size?: "sm" | "md" }) {
  if (!count) return <span className="text-sm text-ink-mute">New</span>;
  const dim = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span className="inline-flex items-center gap-1 text-sm text-ink-soft" aria-label={`Rated ${value} out of 5 from ${count} reviews`}>
      <Star className={cn(dim, "fill-amber-400 text-amber-400")} />
      <span className="font-medium text-ink">{value.toFixed(1)}</span>
      <span>({count})</span>
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => onChange(n)}>
          <Star className={cn("h-7 w-7 transition-colors", n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-300")} />
        </button>
      ))}
    </div>
  );
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-ink-soft">{label}</dt>
      <dd className="text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}
