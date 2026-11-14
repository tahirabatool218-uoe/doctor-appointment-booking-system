"use client";
import { useAuth } from "@/features/auth/AuthProvider";
import { useFetch } from "@/hooks/useFetch";
import { doctorService } from "@/services";

/** Loads the signed-in doctor's profile (user.doctorId, see README contract notes). */
export function useMyDoctor() {
  const { user } = useAuth();
  return useFetch(() => doctorService.get(user!.doctorId!), [user?.doctorId], !!user?.doctorId);
}
