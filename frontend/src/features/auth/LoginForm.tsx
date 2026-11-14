"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Alert, Card, CardBody } from "@/components/ui";
import { getErrorMessage, USE_MOCK } from "@/lib/axios";
import { DEMO_PASSWORD, resetMockDb } from "@/lib/mock/db";
import { homeFor, useAuth } from "./AuthProvider";
import { loginSchema, type LoginForm as Values } from "./schemas";

const DEMO = [
  { role: "Patient", email: "ali.khan@example.com" },
  { role: "Doctor", email: "sarah.ahmed@mediora.pk" },
  { role: "Admin", email: "admin@mediora.pk" },
];

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const user = await login(values);
      const next = params.get("next");
      router.replace(next && next.startsWith(`/${user.role}`) ? next : homeFor(user.role));
    } catch (e) { setError(getErrorMessage(e)); }
  });

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Input label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
        <Input label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>Sign in</Button>
      </form>
      {USE_MOCK && (
        <Card className="bg-brand-50/50 shadow-none">
          <CardBody className="space-y-3 !p-4">
            <p className="text-sm font-medium text-ink">Try a demo account</p>
            <div className="flex flex-wrap gap-2">
              {DEMO.map((d) => (
                <Button key={d.role} type="button" size="sm" variant="outline"
                  onClick={() => { setValue("email", d.email); setValue("password", DEMO_PASSWORD); }}>
                  {d.role}
                </Button>
              ))}
            </div>
            <p className="text-xs text-ink-soft">Fills in the form. Demo data is stored in this browser only.{" "}
              <button type="button" className="font-medium text-brand-700 underline" onClick={() => { resetMockDb(); window.location.reload(); }}>Reset demo data</button>
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
