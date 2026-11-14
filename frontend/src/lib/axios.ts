import axios, { AxiosError } from "axios";
import { mockAdapter } from "./mock/adapter";
import type { ApiErrorBody } from "@/types";

export const TOKEN_KEY = "dab_token";
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  ...(USE_MOCK ? { adapter: mockAdapter } : {}),
});

http.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiErrorBody>) => {
    const isAuthCall = error.config?.url?.startsWith("/auth/login");
    if (error.response?.status === 401 && !isAuthCall && typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    return err.response?.data?.error?.message ?? (err.response ? "Request failed" : "Cannot reach the server. Check your connection.");
  }
  return err instanceof Error ? err.message : "Something went wrong";
}
