"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { BarChart3, Briefcase, LogOut, Menu, Settings, Sparkles, User2, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

import { cn } from "@/lib/utils";

const DEMO_EMAIL = "demo@jobpilot.app";

const navItems = [
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile", label: "My Profile", icon: User2 },
  { href: "/generate-cv", label: "Generate CV", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

const titles: Record<string, string> = {
  "/jobs": "Jobs",
  "/analytics": "Analytics",
  "/profile": "My Profile",
  "/generate-cv": "Generate CV",
  "/settings": "Settings",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = session?.user ?? null;
  const isDemo = user?.email === DEMO_EMAIL;
  const loading = status === "loading";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  const initials = useMemo(() => {
    const label = user?.name || user?.email || "U";
    return label
      .split(/\s|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join("");
  }, [user]);

  function handleLogout() {
    signOut({ callbackUrl: "/login" });
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform duration-200",
          "md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <Link href="/jobs" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500 text-white">
              <Briefcase className="size-4" />
            </span>
            <span className="font-bold text-slate-900">JobPilot</span>
          </Link>
          <button
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <item.icon className={cn("size-4", active ? "text-blue-500" : "text-slate-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="shrink-0 border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              {initials}
            </div>
            <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <LogOut className="size-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen ? (
        <button
          className="fixed inset-0 z-30 bg-slate-900/30 md:hidden"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* ── Main panel ──────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
            <h1 className="text-base font-semibold text-slate-900">
              {titles[pathname] ?? "JobPilot"}
            </h1>
          </div>
          <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
            {initials}
          </div>
        </header>

        {/* Demo banner */}
        {isDemo && (
          <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-700">
            👀 You&apos;re viewing the <strong>demo account</strong>. Data is read-only — sign up for a free account to track your own jobs.
          </div>
        )}
        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
