import Link from "next/link";

export function Logo({ light, href = "/" }: { light?: boolean; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="9" className="fill-brand-600" />
        <path d="M16 7v18M7 16h18" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="16" cy="16" r="4.2" className="fill-accent-400" />
      </svg>
      <span className={light ? "text-white" : "text-navy"}>Mediora</span>
    </Link>
  );
}
