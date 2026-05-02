import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "GOKLIRR Screening — Candidate Scoring System",
  description: "Sistem screening CV otomatis untuk GOKLIRR cleaning service",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-2">
                  <span className="h-7 w-7 rounded-md bg-brand-600 text-white grid place-items-center font-bold text-sm">
                    G
                  </span>
                  <span className="font-semibold">GOKLIRR Screening</span>
                </Link>
                <nav className="hidden md:flex items-center gap-1 text-sm">
                  <NavLink href="/">Dashboard</NavLink>
                  <NavLink href="/pipeline">Pipeline</NavLink>
                  <NavLink href="/upload">Upload CV</NavLink>
                </nav>
              </div>
              <Link href="/upload" className="btn-primary">
                + Upload CV
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">{children}</main>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    >
      {children}
    </Link>
  );
}
