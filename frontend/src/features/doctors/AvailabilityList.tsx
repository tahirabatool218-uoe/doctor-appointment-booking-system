import { DAYS, formatTime } from "@/lib/utils";
import type { Availability } from "@/types";

export function AvailabilityList({ availability }: { availability: Availability[] }) {
  if (!availability.length) return <p className="text-sm text-ink-soft">No working hours published yet.</p>;
  const sorted = [...availability].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  return (
    <ul className="divide-y divide-slate-100 text-sm">
      {sorted.map((a, i) => (
        <li key={i} className="flex justify-between py-2"><span className="text-ink-soft">{DAYS[a.dayOfWeek]}</span><span className="font-medium text-ink">{formatTime(a.startTime)} to {formatTime(a.endTime)}</span></li>
      ))}
    </ul>
  );
}
