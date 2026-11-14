"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import type { NavItem } from "./nav";

export function DashboardShell({ nav, roleLabel, children }: { nav: NavItem[]; roleLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const root = nav[0].href;

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === root ? pathname === root : pathname.startsWith(href));
  const sidebar = (
    <div className="flex h-full flex-col bg-navy">
      <div className="flex h-16 items-center justify-between px-5"><Logo light href={root} />
        <button className="rounded-md p-1 text-slate-300 hover:bg-navy-800 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
      </div>
      <div className="px-5 pb-3 pt-2"><span className="inline-flex items-center rounded-full bg-brand-600/20 px-2.5 py-0.5 text-xs font-semibold text-brand-200 ring-1 ring-inset ring-brand-400/30">{roleLabel} workspace</span></div>
      <nav className="flex-1 space-y-1 px-3" aria-label={`${roleLabel} navigation`}>
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150", isActive(href) ? "bg-brand-600 text-white shadow-md shadow-brand-900/40" : "text-slate-300 hover:bg-navy-800 hover:text-white")}>
            <Icon className="h-5 w-5" />{label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-navy-800 p-3">
        <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-navy-800 hover:text-white"><ExternalLink className="h-5 w-5" />Visit website</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-mist">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%]">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="rounded-md p-2 text-ink-soft hover:bg-slate-100 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="h-6 w-6" /></button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-ink">{user?.name}</p>
              <p className="text-xs text-ink-mute">{user?.email}</p>
            </div>
            <Avatar name={user?.name ?? "U"} size="sm" />
            <button onClick={() => { logout(); router.replace("/login"); }} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-ink-soft hover:bg-slate-100" aria-label="Sign out">
              <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
