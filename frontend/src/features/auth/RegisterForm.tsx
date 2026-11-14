"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Input } from "@/components/ui";
import { getErrorMessage } from "@/lib/axios";
import { homeFor, useAuth } from "./AuthProvider";
import { registerSchema, type RegisterForm as Values } from "./schemas";

export function RegisterForm() {
  const { register: signUp } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async ({ confirmPassword: _c, phone, ...rest }) => {
    setError(null);
    try {
      const user = await signUp({ ...rest, phone: phone || undefined });
      router.replace(homeFor(user.role));
    } catch (e) { setError(getErrorMessage(e)); }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <Alert>{error}</Alert>}
      <Input label="Full name" autoComplete="name" error={errors.name?.message} {...register("name")} />
      <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <Input label="Phone (optional)" type="tel" autoComplete="tel" placeholder="+92 300 1234567" error={errors.phone?.message} {...register("phone")} />
      <Input label="Password" type="password" autoComplete="new-password" hint="At least 8 characters, with a letter and a number." error={errors.password?.message} {...register("password")} />
      <Input label="Confirm password" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />
      <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>Create account</Button>
    </form>
  );
}
