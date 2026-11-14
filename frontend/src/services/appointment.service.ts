import { http } from "@/lib/axios";
import type { ApiList, Appointment, AppointmentStatus, CreateAppointmentPayload, UpdateStatusPayload } from "@/types";

export const appointmentService = {
  list: (params?: { status?: AppointmentStatus; date?: string; page?: number; limit?: number }) =>
    http.get<ApiList<Appointment>>("/appointments", { params: { limit: 200, ...params } }).then((r) => r.data),
  get: (id: string) => http.get<{ data: Appointment }>(`/appointments/${id}`).then((r) => r.data.data),
  create: (p: CreateAppointmentPayload) => http.post<{ data: Appointment }>("/appointments", p).then((r) => r.data.data),
  updateStatus: (id: string, p: UpdateStatusPayload) => http.patch<{ data: Appointment }>(`/appointments/${id}/status`, p).then((r) => r.data.data),
};
