import Link from "next/link";
import {
  BarChart3,
  Bot,
  Folders,
  Lock,
  MousePointerClick,
  PenLine,
  Rocket,
} from "lucide-react";

const features = [
  {
    icon: MousePointerClick,
    title: "One-Click Capture",
    description: "Save any job posting instantly from your browser",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Bot,
    title: "AI Suitability Analysis",
    description: "Know your fit before you apply",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: BarChart3,
    title: "Smart Dashboard",
    description: "Track status, deadlines, and priorities at a glance",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Folders,
    title: "Multi-Category",
    description: "Organize by country, role type, or company",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Lock,
    title: "Secure & Private",
    description: "Your data stays yours, protected by login",
    color: "from-rose-500 to-pink-500",
  },
  {
    icon: PenLine,
    title: "Resume Optimizer",
    description: "Tailor your CV to each job with AI assistance",
    color: "from-violet-500 to-indigo-500",
    comingSoon: true,
  },
];

const stats = [
  { value: "10k+", label: "Jobs Tracked" },
  { value: "2k+", label: "Active Users" },
  { value: "94%", label: "Success Rate" },
];

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-[#F4F5FA]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="flex shrink-0 items-center justify-between px-6 py-4"
        style={{ background: "linear-gradient(160deg,#2D1B69 0%,#1A0F3E 100%)" }}
      >
        <Link href="/" className="flex items-center gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-xl shadow-lg"
            style={{ background: "linear-gradient(135deg,#7C3AED,#3B82F6)" }}
          >
            <Rocket className="size-4 text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold leading-tight tracking-tight text-white">JobPilot</p>
            <p className="text-[10px] text-purple-300/80">Navigate your dream career ✨</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-purple-200/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)" }}
          >
            Get Started →
          </Link>
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
        {/* Soft purple glow */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-[480px] w-[600px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle,#7C3AED 0%,transparent 70%)" }}
        />

        {/* Badge pill */}
        <div
          className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-purple-700"
          style={{
            background: "rgba(124,58,237,0.10)",
            border: "1px solid rgba(124,58,237,0.25)",
          }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: "linear-gradient(135deg,#A78BFA,#7C3AED)" }}
          />
          Free · Private · AI-Powered
        </div>

        {/* Headline */}
        <h1 className="mt-1 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
          Your Job Search,{" "}
          <spa