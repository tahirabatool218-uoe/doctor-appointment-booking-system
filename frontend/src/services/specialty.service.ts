import { http } from "@/lib/axios";
import type { Specialty } from "@/types";

export const specialtyService = {
  list: () => http.get<{ data: Specialty[] }>("/specialties").then((r) => r.data.data),
  create: (p: { name: string; description?: string }) => http.post<{ data: Specialty }>("/specialties", p).then((r) => r.data.data),
  update: (id: string, p: { name?: string; description?: string; isActive?: boolean }) =>
    http.patch<{ data: Specialty }>(`/specialties/${id}`, p).then((r) => r.data.data),
  remove: (id: string) => http.delete(`/specialties/${id}`).then(() => undefined),
};
