import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="bg-navy text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div className="space-y-3">
          <Logo light />
          <p className="max-w-xs text-sm text-slate-400">Book trusted, approved doctors in minutes and manage every appointment in one place.</p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">Patients</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/doctors" className="transition-colors hover:text-white">Find a doctor</Link></li>
            <li><Link href="/register" className="transition-colors hover:text-white">Create an account</Link></li>
            <li><Link href="/login" className="transition-colors hover:text-white">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">Contact</h3>
          <ul className="space-y-2 text-sm">
            <li>support@mediora.pk</li>
            <li>+92 41 111 000 111</li>
            <li>Faisalabad, Punjab</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-800 py-4 text-center text-xs text-slate-400">© {new Date().getFullYear()} Mediora. Sample project: not a real medical service.</div>
    </footer>
  );
}
