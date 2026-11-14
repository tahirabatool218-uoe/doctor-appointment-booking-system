import { http } from "@/lib/axios";
import type { AuthResponse, LoginPayload, RegisterPayload, User } from "@/types";

export const authService = {
  register: (p: RegisterPayload) => http.post<{ data: AuthResponse }>("/auth/register", p).then((r) => r.data.data),
  login: (p: LoginPayload) => http.post<{ data: AuthResponse }>("/auth/login", p).then((r) => r.data.data),
  me: () => http.get<{ data: { user: User } }>("/auth/me").then((r) => r.data.data.user),
};
