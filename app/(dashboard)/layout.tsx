"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  BarChart3, Bell, Brain, Briefcase, ChevronDown,
  FileText, Inbox, LogOut, Menu, Moon, Rocket,
  Settings, Sparkles, User2, X,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const DEMO_EMAIL = "demo@jobpilot.app";

const navItems = [
  { href: "/jobs",           label: "Jobs",          icon: Briefcase },
  { href: "/analytics",     label: "Analytics",     icon: BarChart3 },
  { href: "/profile",       label: "My Profile",    icon: User2 },
  { href: "/skill-analysis",label: "Skill Analysis",icon: Sparkles },
  { href: "/generate-cv",   label: "Generate CV",   icon: FileText, badge: "AI" },
  { href: "/resumes",       label: "Resumes",       icon: FileText },
  { href: "/insights",      label: "Insights",      icon: Brain },
  { href: "/inbox",         label: "Inbox",         icon: Inbox },
  { href: "/settings",      label: "Settings",      icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = session?.user ?? null;
  const isDemo = user?.email === DEMO_EMAIL;
  const loading = status === "loading";

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  const initials = useMemo(() => {
    const label = user?.name || user?.email || "U";
    return label.split(/\s|@/).filter(Boolean).slice(0, 2)
      .map((p: string) => p[0]?.toUpperCase()).join("");
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F5FA] text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F5FA]">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col transition-transform duration-200",
          "md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ background: "linear-gradient(160deg,#2D1B69 0%,#1A0F3E 100%)" }}
      >
        {/* Logo */}
        <div className="flex h-[72px] shrink-0 items-center justify-between px-5">
          <Link href="/jobs" className="flex items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-lg"
              style={{ background: "linear-gradient(135deg,#7C3AED,#3B82F6)" }}
            >
              <Rocket className="size-5 text-white" />
            </div>
            <div>
              <p className="text-[15px] font-bold leading-tight tracking-tight text-white">JobPilot</p>
              <p className="mt-0.5 text-[10px] text-purple-300/80">Navigate your dream career ✨</p>
            </div>
          </Link>
          <button
            className="rounded-lg p-1 text-purple-300 hover:bg-white/10 md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 min-h-0 overflow-y-auto space-y-0.5 px-3 py-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all",
                  active ? "text-white shadow-md" : "text-purple-200/80 hover:text-white hover:bg-white/10",
                )}
                style={active ? { background: "linear-gradient(135deg,#7C3AED,#6D28D9)" } : undefined}
              >
                <item.icon className={cn("size-4 shrink-0", active ? "text-white" : "text-purple-300/70")} />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="rounded-md bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-emerald-300">
                    + {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade card */}
        <div
          className="mx-3 mb-3 rounded-2xl p-4"
          style={{ background: "rgba(124,58,237,0.18)", border: "1px solid rgba(139,92,246,0.35)" }}
        >
          <p className="text-sm font-semibold text-white">Unlock More Power 🚀</p>
          <p className="mt-1 text-[11px] leading-relaxed text-purple-300/80">
            Advanced analytics, AI tools and smart insights to boost your career.
          </p>
          <button
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}
          >
            Upgrade to Pro →
          </button>
        </div>

        {/* User */}
        <div className="shrink-0 px-3 pb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="mt-2 flex items-center gap-2.5 rounded-xl px-2 py-2">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-md"
              style={{ background: "linear-gradient(135deg,#7C3AED,#3B82F6)" }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium leading-tight text-white">{user?.email}</p>
              {isDemo && <p className="mt-0.5 text-[10px] text-purple-300/70">Demo Account</p>}
            </div>
            <ChevronDown className="size-4 shrink-0 text-purple-300/70" />
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-purple-300/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <button className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-[72px] shrink-0 items-center gap-4 border-b border-slate-200/60 bg-white px-6">
          <button
            className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </button>

          {/* Search */}
          <div className="hidden max-w-sm flex-1 md:flex">
            <div className="relative w-full">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search across jobs, companies, notes..."
                className="w-full rounded-full bg-slate-100/80 py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 outline-none transition-colors focus:bg-slate-100"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100">
              <Bell className="size-5" />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500" />
            </button>
            <button className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100">
              <Moon className="size-5" />
            </button>
            <div
              className="ml-1 flex size-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-md"
              style={{ background: "linear-gradient(135deg,#7C3AED,#3B82F6)" }}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Demo banner */}
        {isDemo && (
          <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-700">
            👀 You&apos;re viewing the <strong>demo account</strong>. Data is read-only — sign up for a free account to track your own jobs.
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
