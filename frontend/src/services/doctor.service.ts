import { http } from "@/lib/axios";
import type { ApiList, CreateDoctorPayload, Doctor, Review, SlotsResponse, UpdateDoctorPayload } from "@/types";

export interface DoctorQuery { specialty?: string; q?: string; page?: number; limit?: number; includeUnapproved?: boolean }

export const doctorService = {
  list: (params?: DoctorQuery) => http.get<ApiList<Doctor>>("/doctors", { params: { limit: 100, ...params } }).then((r) => r.data),
  get: (id: string) => http.get<{ data: Doctor }>(`/doctors/${id}`).then((r) => r.data.data),
  create: (p: CreateDoctorPayload) => http.post<{ data: Doctor }>("/doctors", p).then((r) => r.data.data),
  update: (id: string, p: UpdateDoctorPayload) => http.patch<{ data: Doctor }>(`/doctors/${id}`, p).then((r) => r.data.data),
  approve: (id: string, isApproved: boolean) => http.patch<{ data: Doctor }>(`/doctors/${id}/approve`, { isApproved }).then((r) => r.data.data),
  slots: (id: string, date: string) => http.get<{ data: SlotsResponse }>(`/doctors/${id}/slots`, { params: { date } }).then((r) => r.data.data),
  reviews: (id: string) => http.get<ApiList<Review>>(`/doctors/${id}/reviews`, { params: { limit: 50 } }).then((r) => r.data),
};
