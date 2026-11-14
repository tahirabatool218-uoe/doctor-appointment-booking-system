"use client";
import { useState, type ReactNode } from "react";
import { Button, Modal, Textarea, useToast } from "@/components/ui";
import { getErrorMessage } from "@/lib/axios";
import { appointmentService } from "@/services";
import { formatDate, formatTime } from "@/lib/utils";
import type { Appointment, Role } from "@/types";
import { STATUS_LABEL, type StatusAction } from "./utils";

/** Opens a confirmation modal (with optional doctor notes) and PATCHes the appointment status. */
export function useStatusUpdater(role: Role, onDone: () => void): { request: (a: Appointment, action: StatusAction) => void; dialog: ReactNode } {
  const toast = useToast();
  const [target, setTarget] = useState<{ appt: Appointment; action: StatusAction } | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const close = () => { setTarget(null); setNotes(""); };

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await appointmentService.updateStatus(target.appt._id, { status: target.action.status, ...(notes.trim() ? { notes: notes.trim() } : {}) });
      toast.success(target.action.status === "cancelled" ? "Appointment cancelled" : `Marked as ${STATUS_LABEL[target.action.status].toLowerCase()}`);
      close(); onDone();
    } catch (e) { toast.error(getErrorMessage(e)); } finally { setBusy(false); }
  };

  const withNotes = role !== "patient";
  const a = target?.appt;
  const dialog = (
    <Modal open={!!target} onClose={close} title={target ? `${target.action.label}: ${a?.patient.name}` : ""}
      footer={<><Button variant="outline" onClick={close}>Go back</Button><Button variant={target?.action.variant === "danger" ? "danger" : "primary"} loading={busy} onClick={submit}>{target?.action.label}</Button></>}>
      {a && (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">{a.doctor.user.name} · {formatDate(a.date)} at {formatTime(a.startTime)}</p>
          {target.action.status === "cancelled" && <p className="text-sm text-ink">This frees the time slot{a.payment?.status === "paid" ? " and refunds the payment" : ""}. This can&apos;t be undone.</p>}
          {withNotes && <Textarea label="Notes for the patient (optional)" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add instructions, follow-up advice or a reason." />}
        </div>
      )}
    </Modal>
  );
  return { request: (appt, action) => { setTarget({ appt, action }); setNotes(appt.notes ?? ""); }, dialog };
}
