import { CalendarCheck, CalendarClock, CalendarPlus, ClipboardList, LayoutDashboard, Stethoscope, Tags, UserCircle, Users, type LucideIcon } from "lucide-react";

export interface NavItem { href: string; label: string; icon: LucideIcon }

export const patientNav: NavItem[] = [
  { href: "/patient", label: "Overview", icon: LayoutDashboard },
  { href: "/patient/book", label: "Book appointment", icon: CalendarPlus },
  { href: "/patient/appointments", label: "My appointments", icon: CalendarCheck },
  { href: "/patient/profile", label: "Profile", icon: UserCircle },
];
export const doctorNav: NavItem[] = [
  { href: "/doctor", label: "Overview", icon: LayoutDashboard },
  { href: "/doctor/requests", label: "Requests", icon: ClipboardList },
  { href: "/doctor/appointments", label: "Appointments", icon: CalendarCheck },
  { href: "/doctor/availability", label: "Availability", icon: CalendarClock },
  { href: "/doctor/profile", label: "Profile", icon: UserCircle },
];
export const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/doctors", label: "Doctors", icon: Stethoscope },
  { href: "/admin/specialties", label: "Specialties", icon: Tags },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarCheck },
];
