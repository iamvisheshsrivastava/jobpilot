"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, Bell, Brain, Briefcase, ChevronDown,
  Crown, FileText, Inbox, LogOut, Menu, Moon,
  Rocket, Settings, Sparkles, Sun, User2, X,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const DEMO_EMAIL = "demo@jobpilot.app";

const navItems = [
  { href: "/jobs",             label: "Jobs",           icon: Briefcase },
  { href: "/analytics",       label: "Analytics",      icon: BarChart3 },
  { href: "/profile",         label: "My Profile",     icon: User2 },
  { href: "/skill-analysis",  label: "Skill Analysis", icon: Sparkles },
  { href: "/generate-cv",     label: "Generate CV",    icon: FileText, badge: "AI" },
  { href: "/resumes",         label: "Resumes",        icon: FileText },
  { href: "/insights",        label: "Insights",       icon: Brain },
  { href: "/inbox",           label: "Inbox",          icon: Inbox },
  { href: "/settings",        label: "Settings",       icon: Settings },
];

const THEMES = [
  { id: "light",  label: "Light",  icon: "☀️" },
  { id: "dark",   label: "Dark",   icon: "🌙" },
  { id: "ocean",  label: "Ocean",  icon: "🌊" },
  { id: "forest", label: "Forest", icon: "🌿" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const themeRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const user = session?.user ?? null;
  const isDemo = user?.email === DEMO_EMAIL;
  const loading = status === "loading";

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch unread notification count
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/notifications?unread=true")
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.unreadCount ?? 0))
      .catch(() => {});
  }, [status, pathname]);

  const initials = useMemo(() => {
    const label = user?.name || user?.email || "U";
    return label.split(/\s|@/).filter(Boolean).slice(0, 2)
      .map((p: string) => p[0]?.toUpperCase()).join("");
  }, [user]);

  const isDark = theme === "dark";

  if (loading) {
    return (
      <div
        className="flex h-screen items-center justify-center text-sm text-slate-400"
        style={{ background: "var(--theme-page-bg, #f8fafc)" }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--theme-page-bg, #f8fafc)" }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col transition-transform duration-200",
          "md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          background: "var(--theme-sidebar-bg, #ffffff)",
          borderRight: "1px solid var(--theme-sidebar-border, #e2e8f0)",
        }}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <Link href="/jobs" className="flex items-center gap-3">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm"
              style={{ background: "linear-gradient(135deg,var(--theme-accent,#7c3aed),var(--theme-accent2,#6d28d9))" }}
            >
              <Rocket className="size-4 text-white" />
            </div>
            <div>
              <p
                className="text-[15px] font-bold leading-tight tracking-tight"
                style={{ color: isDark ? "#e2e8f0" : "#1e293b" }}
              >
                JobPilot
              </p>
              <p className="mt-0.5 text-[10px]" style={{ color: "var(--theme-nav-text, #64748b)" }}>
                Navigate your dream career ✨
              </p>
            </div>
          </Link>
          <button
            className="rounded-lg p-1 hover:bg-black/5 md:hidden"
            style={{ color: "var(--theme-nav-text, #64748b)" }}
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
                className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all"
                style={active ? {
                  background: "var(--theme-nav-active-bg, #f3f0ff)",
                  color: "var(--theme-nav-active-text, #6d28d9)",
                } : {
                  color: "var(--theme-nav-text, #64748b)",
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = "var(--theme-nav-hover-bg, #f8fafc)";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = "";
                }}
              >
                <item.icon
                  className="size-4 shrink-0"
                  style={{ color: active ? "var(--theme-nav-active-icon, #7c3aed)" : "var(--theme-nav-text, #64748b)" }}
                />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                    style={{
                      background: "var(--theme-badge-ai-bg, #d1fae5)",
                      color: "var(--theme-badge-ai-text, #065f46)",
                    }}
                  >
                    + {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Go Pro */}
        <div
          className="mx-3 mb-3 rounded-xl p-3"
          style={{
            background: "var(--theme-pro-bg, #faf5ff)",
            border: "1px solid var(--theme-pro-border, #e9d5ff)",
          }}
        >
          <div className="flex items-center gap-2">
            <Crown className="size-4" style={{ color: "var(--theme-pro-text, #6d28d9)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--theme-pro-text, #6d28d9)" }}>
              Go Pro
            </p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--theme-nav-text, #64748b)" }}>
            Unlock advanced insights, AI tools and more.
          </p>
          <button
            className="mt-2.5 flex w-full items-center justify-center rounded-lg py-1.5 text-xs font-semibold transition-opacity hover:opacity-90"
            style={{
              border: "1px solid var(--theme-pro-border, #e9d5ff)",
              color: "var(--theme-pro-text, #6d28d9)",
            }}
          >
            Upgrade Now
          </button>
        </div>

        {/* User section */}
        <div
          className="shrink-0 px-3 pb-4 pt-2"
          style={{ borderTop: "1px solid var(--theme-sidebar-border, #e2e8f0)" }}
        >
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
              style={{ background: "linear-gradient(135deg,var(--theme-accent,#7c3aed),var(--theme-accent2,#6d28d9))" }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-xs font-medium leading-tight"
                style={{ color: isDark ? "#e2e8f0" : "#334155" }}
              >
                {user?.email}
              </p>
              {isDemo && (
                <p className="mt-0.5 text-[10px]" style={{ color: "var(--theme-nav-text, #64748b)" }}>
                  Demo Account
                </p>
              )}
            </div>
            <ChevronDown className="size-3.5 shrink-0" style={{ color: "var(--theme-nav-text, #64748b)" }} />
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors"
            style={{ color: "var(--theme-nav-text, #64748b)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--theme-nav-hover-bg, #f8fafc)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
          >
            <LogOut className="size-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header
          className="flex h-16 shrink-0 items-center gap-4 px-6"
          style={{
            background: "var(--theme-header-bg, #ffffff)",
            borderBottom: "1px solid var(--theme-sidebar-border, #e2e8f0)",
          }}
        >
          <button
            className="rounded-lg p-1.5 transition-colors hover:bg-black/5 md:hidden"
            style={{ color: "var(--theme-nav-text, #64748b)" }}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </button>

          {/* Search */}
          <div className="hidden max-w-sm flex-1 md:flex">
            <div className="relative w-full">
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search across jobs, companies, notes..."
                className="w-full rounded-full bg-slate-100/80 py-2.5 pl-10 pr-4 text-sm placeholder-slate-400 outline-none transition-colors focus:bg-slate-100"
                style={{ color: isDark ? "#e2e8f0" : "#334155" }}
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1">
            {/* Bell */}
            <Link
              href="/inbox"
              className="relative rounded-full p-2 transition-colors hover:bg-black/5"
              style={{ color: "var(--theme-nav-text, #64748b)" }}
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {/* Theme switcher */}
            <div className="relative" ref={themeRef}>
              <button
                className="rounded-full p-2 transition-colors hover:bg-black/5"
                style={{ color: "var(--theme-nav-text, #64748b)" }}
                onClick={() => { setThemeOpen((o) => !o); setAvatarOpen(false); }}
                title="Change theme"
              >
                {isDark ? <Moon className="size-5" /> : <Sun className="size-5" />}
              </button>
              {themeOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-40 rounded-xl border py-1 shadow-lg z-50"
                  style={{
                    background: "var(--theme-card-bg, #ffffff)",
                    borderColor: "var(--theme-sidebar-border, #e2e8f0)",
                  }}
                >
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setTheme(t.id); setThemeOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors"
                      style={{
                        color: theme === t.id ? "var(--theme-nav-active-text, #6d28d9)" : "var(--theme-nav-text, #64748b)",
                        background: theme === t.id ? "var(--theme-nav-active-bg, #f3f0ff)" : "transparent",
                      }}
                    >
                      <span>{t.icon}</span>
                      {t.label}
                      {theme === t.id && <span className="ml-auto text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Avatar dropdown */}
            <div className="relative ml-1" ref={avatarRef}>
              <button
                className="flex size-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg,var(--theme-accent,#7c3aed),var(--theme-accent2,#6d28d9))" }}
                onClick={() => { setAvatarOpen((o) => !o); setThemeOpen(false); }}
              >
                {initials}
              </button>
              {avatarOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-52 rounded-xl border py-1 shadow-lg z-50"
                  style={{
                    background: "var(--theme-card-bg, #ffffff)",
                    borderColor: "var(--theme-sidebar-border, #e2e8f0)",
                  }}
                >
                  <div
                    className="border-b px-3 py-2.5"
                    style={{ borderColor: "var(--theme-sidebar-border, #e2e8f0)" }}
                  >
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: isDark ? "#e2e8f0" : "#1e293b" }}
                    >
                      {user?.name || user?.email?.split("@")[0]}
                    </p>
                    <p className="mt-0.5 truncate text-xs" style={{ color: "var(--theme-nav-text, #64748b)" }}>
                      {user?.email}
                    </p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setAvatarOpen(false)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                    style={{ color: "var(--theme-nav-text, #64748b)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--theme-nav-hover-bg, #f8fafc)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
                  >
                    <Settings className="size-4" />
                    Settings
                  </Link>
                  <button
                    onClick={() => { setAvatarOpen(false); signOut({ callbackUrl: "/login" }); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                    style={{ color: "#ef4444" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#fef2f2"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
                  >
                    <LogOut className="size-4" />
                    Log Out
                  </button>
                </div>
              )}
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
