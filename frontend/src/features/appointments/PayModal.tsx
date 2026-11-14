"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal, Select, useToast } from "@/components/ui";
import { getErrorMessage } from "@/lib/axios";
import { paymentService } from "@/services";
import { formatCurrency } from "@/lib/utils";
import type { Payment } from "@/types";

const schema = z.object({
  method: z.enum(["card", "cash", "online"], { errorMap: () => ({ message: "Choose a payment method" }) }),
  transactionRef: z.string().max(40).optional(),
});
type Values = z.infer<typeof schema>;

export function PayModal({ open, onClose, appointmentId, payment, onPaid }: {
  open: boolean; onClose: () => void; appointmentId: string; payment: Payment; onPaid: () => void;
}) {
  const toast = useToast();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { method: "card" } });
  const method = watch("method");
  const submit = handleSubmit(async (v) => {
    try {
      await paymentService.pay(appointmentId, { method: v.method, transactionRef: v.transactionRef || undefined });
      toast.success("Payment received"); onClose(); onPaid();
    } catch (e) { toast.error(getErrorMessage(e)); }
  });
  return (
    <Modal open={open} onClose={onClose} title="Pay for appointment"
      footer={<><Button variant="outline" onClick={onClose}>Not now</Button><Button loading={isSubmitting} onClick={submit}>Pay {formatCurrency(payment.amount, payment.currency)}</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Select label="Payment method" error={errors.method?.message} {...register("method")}>
          <option value="card">Credit or debit card</option>
          <option value="online">Online transfer (JazzCash, Easypaisa, bank)</option>
          <option value="cash">Cash at the clinic</option>
        </Select>
        {method === "online" && <Input label="Transaction reference (optional)" placeholder="e.g. TXN-482913" error={errors.transactionRef?.message} {...register("transactionRef")} />}
        <p className="text-xs text-ink-mute">This is a simulated payment for the demo. No real money moves.</p>
      </form>
    </Modal>
  );
}
