"use client";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/features/auth/LoginForm";
import { homeFor, useAuth } from "@/features/auth/AuthProvider";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && user) router.replace(homeFor(user.role)); }, [loading, user, router]);
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
      <h1 className="font-display text-3xl font-semibold text-navy">Welcome back</h1>
      <p className="mb-6 mt-1 text-ink-soft">Sign in to manage your appointments.</p>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
        <Suspense fallback={null}><LoginForm /></Suspense>
      </div>
      <p className="mt-6 text-center text-sm text-ink-soft">New patient? <Link href="/register" className="font-medium text-brand-700 hover:underline">Create an account</Link></p>
    </div>
  );
}
