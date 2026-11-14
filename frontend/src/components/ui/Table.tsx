import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Table({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">{children}</table></div>;
}
export const THead = ({ children }: { children: ReactNode }) => <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-ink-soft">{children}</thead>;
export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => <th scope="col" className={cn("whitespace-nowrap px-4 py-3 font-semibold", className)}>{children}</th>;
export const TBody = ({ children }: { children: ReactNode }) => <tbody className="divide-y divide-slate-100">{children}</tbody>;
export const Tr = ({ children }: { children: ReactNode }) => <tr className="transition-colors hover:bg-brand-50/40">{children}</tr>;
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cn("px-4 py-3 align-middle text-ink", className)}>{children}</td>;
