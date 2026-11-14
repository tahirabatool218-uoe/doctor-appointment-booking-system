import { http } from "@/lib/axios";
import type { Payment, PayPayload } from "@/types";

export const paymentService = {
  pay: (appointmentId: string, p: PayPayload) => http.post<{ data: Payment }>(`/payments/${appointmentId}/pay`, p).then((r) => r.data.data),
};
