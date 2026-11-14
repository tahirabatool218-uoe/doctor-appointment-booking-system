"use client";
import { Suspense } from "react";
import { PageHeader, PageLoader } from "@/components/ui";
import { BookingForm } from "@/features/appointments/BookingForm";

export default function BookAppointmentPage() {
  return (
    <>
      <PageHeader title="Book an appointment" description="Pick a doctor, choose an open time and send your request." />
      <Suspense fallback={<PageLoader />}><BookingForm /></Suspense>
    </>
  );
}
