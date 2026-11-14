import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ToastProvider } from "@/components/ui";

export const metadata: Metadata = {
  title: { default: "Mediora: book a doctor online", template: "%s | Mediora" },
  description: "Find approved doctors, check real availability and book appointments in minutes.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2563EB" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider><AuthProvider>{children}</AuthProvider></ToastProvider>
      </body>
    </html>
  );
}
