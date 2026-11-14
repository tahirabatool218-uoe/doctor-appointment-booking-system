import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useId } from "react";
import { cn } from "@/lib/utils";

interface ShellProps { label?: string; error?: string; hint?: string; id: string; children: ReactNode; className?: string }
export function FieldShell({ label, error, hint, id, children, className }: ShellProps) {
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>}
      {children}
      {error ? <p role="alert" className="mt-1.5 text-sm text-red-600">{error}</p> : hint ? <p className="mt-1.5 text-sm text-ink-mute">{hint}</p> : null}
    </div>
  );
}
const control = (error?: string) =>
  cn("block w-full rounded-lg border bg-white px-3 text-sm text-ink placeholder:text-ink-mute transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:text-ink-mute",
    error ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-300 hover:border-slate-400 focus:border-brand-500 focus:ring-brand-100");

type Common = { label?: string; error?: string; hint?: string; wrapperClassName?: string };

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Common>(function Input(
  { label, error, hint, wrapperClassName, className, id, ...rest }, ref
) {
  const auto = useId(); const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} error={error} hint={hint} className={wrapperClassName}>
      <input ref={ref} id={fid} aria-invalid={!!error} className={cn(control(error), "h-10", className)} {...rest} />
    </FieldShell>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & Common>(function Select(
  { label, error, hint, wrapperClassName, className, id, children, ...rest }, ref
) {
  const auto = useId(); const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} error={error} hint={hint} className={wrapperClassName}>
      <select ref={ref} id={fid} aria-invalid={!!error} className={cn(control(error), "h-10 pr-8", className)} {...rest}>{children}</select>
    </FieldShell>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Common>(function Textarea(
  { label, error, hint, wrapperClassName, className, id, ...rest }, ref
) {
  const auto = useId(); const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} error={error} hint={hint} className={wrapperClassName}>
      <textarea ref={ref} id={fid} aria-invalid={!!error} className={cn(control(error), "min-h-[96px] py-2", className)} {...rest} />
    </FieldShell>
  );
});
