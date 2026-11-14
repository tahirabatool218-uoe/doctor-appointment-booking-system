"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { homeFor, useAuth } from "@/features/auth/AuthProvider";
import { Button, LinkButton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const links = [
  { href: "/", label: "Home" },
  { href: "/doctors", label: "Find a doctor" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const cta = loading ? null : user ? (
    <>
      <LinkButton href={homeFor(user.role)} variant="secondary" size="sm">Dashboard</LinkButton>
      <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
    </>
  ) : (
    <>
      <LinkButton href="/login" variant="ghost" size="sm">Sign in</LinkButton>
      <LinkButton href="/register" size="sm">Create account</LinkButton>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-10">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={cn("rounded-md px-3 py-2 text-sm font-medium", active(l.href) ? "bg-brand-50 text-brand-800" : "text-ink-soft hover:text-ink")}>{l.label}</Link>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-2 md:flex">{cta}</div>
        <button className="rounded-md p-2 text-ink-soft hover:bg-slate-100 md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-slate-100 bg-white px-4 pb-4 pt-2 md:hidden" onClick={() => setOpen(false)}>
          <nav className="flex flex-col" aria-label="Mobile">
            {links.map((l) => <Link key={l.href} href={l.href} className="rounded-md px-3 py-3 text-sm font-medium text-ink">{l.label}</Link>)}
          </nav>
          <div className="mt-2 flex gap-2">{cta}</div>
        </div>
      )}
    </header>
  );
}
