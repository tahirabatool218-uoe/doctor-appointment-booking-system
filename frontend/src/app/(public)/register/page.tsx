"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RegisterForm } from "@/features/auth/RegisterForm";
import { homeFor, useAuth } from "@/features/auth/AuthProvider";

export default function RegisterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && user) router.replace(homeFor(user.role)); }, [loading, user, router]);
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
      <h1 className="font-display text-3xl font-semibold text-navy">Create your patient account</h1>
      <p className="mb-6 mt-1 text-ink-soft">Book and track appointments in one place. Doctor accounts are created by an admin.</p>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel"><RegisterForm /></div>
      <p className="mt-6 text-center text-sm text-ink-soft">Already registered? <Link href="/login" className="font-medium text-brand-700 hover:underline">Sign in</Link></p>
    </div>
  );
}
