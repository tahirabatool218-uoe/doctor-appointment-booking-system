import { http } from "@/lib/axios";
import type { ApiList, Role, User } from "@/types";

export const userService = {
  list: (params?: { role?: Role; page?: number; limit?: number }) =>
    http.get<ApiList<User>>("/users", { params: { limit: 200, ...params } }).then((r) => r.data),
  updateMe: (p: { name?: string; phone?: string }) => http.patch<{ data: User }>("/users/me", p).then((r) => r.data.data),
  update: (id: string, p: { isActive?: boolean; role?: Role }) => http.patch<{ data: User }>(`/users/${id}`, p).then((r) => r.data.data),
};
