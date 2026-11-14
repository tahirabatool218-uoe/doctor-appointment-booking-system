import { cn } from "@/lib/utils";

export interface Tab<T extends string> { value: T; label: string; count?: number }

export function StatusTabs<T extends string>({ tabs, value, onChange }: { tabs: Tab<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={cn("-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors", value === t.value ? "border-brand-600 text-brand-800" : "border-transparent text-ink-soft hover:text-ink")}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-ink-soft">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
