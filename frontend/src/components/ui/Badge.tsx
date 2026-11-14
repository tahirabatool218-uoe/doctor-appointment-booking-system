import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "green" | "amber" | "red" | "blue" | "teal" | "slate" | "brand";
const tones: Record<Tone, string> = {
  green: "bg-green-50 text-green-700 ring-green-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/25",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  blue: "bg-brand-50 text-brand-700 ring-brand-600/20",
  teal: "bg-accent-50 text-accent-700 ring-accent-600/20",
  slate: "bg-slate-100 text-slate-700 ring-slate-500/20",
  brand: "bg-brand-50 text-brand-800 ring-brand-600/20",
};
export function Badge({ tone = "slate", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", tones[tone], className)}>{children}</span>;
}
