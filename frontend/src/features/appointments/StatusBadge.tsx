import { Badge } from "@/components/ui";
import type { AppointmentStatus, PaymentStatus } from "@/types";
import { PAYMENT_TONE, STATUS_LABEL, STATUS_TONE } from "./utils";

export const StatusBadge = ({ status }: { status: AppointmentStatus }) => <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
export const PaymentBadge = ({ status }: { status: PaymentStatus }) => <Badge tone={PAYMENT_TONE[status]}>{status[0].toUpperCase() + status.slice(1)}</Badge>;
