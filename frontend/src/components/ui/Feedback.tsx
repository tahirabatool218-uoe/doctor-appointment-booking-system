import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn("h-5 w-5 animate-spin text-brand-600", className)} aria-label="Loading" />;

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-ink-soft" role="status">
      <Spinner className="h-7 w-7" /><span className="text-sm">{label}</span>
    </div>
  );
}
export const Skeleton = ({ className }: { className?: string }) => <div className={cn("animate-pulse rounded-lg bg-slate-200/70", className)} />;

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-tint/40 px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-brand-100 p-3 text-brand-600">{icon ?? <Inbox className="h-6 w-6" />}</div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/60 px-6 py-10 text-center">
      <AlertTriangle className="mb-2 h-6 w-6 text-red-600" />
      <h3 className="text-base font-semibold text-red-900">Couldn&apos;t load this</h3>
      <p className="mt-1 max-w-sm text-sm text-red-800">{message}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
export function Alert({ tone = "red", children }: { tone?: "red" | "green" | "amber" | "blue"; children: ReactNode }) {
  const t = { red: "border-red-200 bg-red-50 text-red-800", green: "border-green-200 bg-green-50 text-green-800", amber: "border-amber-200 bg-amber-50 text-amber-900", blue: "border-brand-200 bg-brand-50 text-navy" }[tone];
  return <div role={tone === "red" ? "alert" : "status"} className={cn("rounded-lg border px-4 py-3 text-sm", t)}>{children}</div>;
}
