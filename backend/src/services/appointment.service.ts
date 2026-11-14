import { Appointment } from "../models/Appointment";
import { DOCTOR_POPULATE } from "./doctor.service";
import { toAppointmentDTOs } from "./serializers";

export const APPT_POPULATE = [
  { path: "patient", select: "name email phone" },
  { path: "doctor", populate: DOCTOR_POPULATE },
];

/** Fetches appointments (populated, with payment + review attached) as response DTOs. */
export async function findAppointmentViews(filter: Record<string, unknown>, sort: Record<string, 1 | -1>, limit: number) {
  const items = await Appointment.find(filter).populate(APPT_POPULATE).sort(sort).limit(limit).lean();
  return toAppointmentDTOs(items);
}
