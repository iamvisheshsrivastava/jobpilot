import Link from "next/link";
import {
  BarChart3, Bot, Folders, Lock,
  MousePointerClick, PenLine, Rocket,
} from "lucide-react";

const features = [
  { icon: MousePointerClick, title: "One-Click Capture", description: "Save any job posting instantly from your browser", color: "from-violet-500 to-purple-600" },
  { icon: Bot, title: "AI Suitability Analysis", description: "Know your fit before you apply", color: "from-blue-500 to-cyan-500" },
  { icon: BarChart3, title: "Smart Dashboard", description: "Track status, deadlines, and priorities at a glance", color: "from-emerald-500 to-teal-500" },
  { icon: Folders, title: "Multi-Category", description: "Organize by country, role type, or company", color: "from-amber-500 to-orange-500" },
  { icon: Lock, title: "Secure & Private", description: "Your data stays yours, protected by login", color: "from-rose-500 to-pink-500" },
  { icon: PenLine, title: "Resume Optimizer", description: "Tailor your CV to each job with AI assistance", color: "from-violet-500 to-indigo-500", comingSoon: true },
];

const stats = [
  { value: "10k+", label: "Jobs Tracked" },
  { value: "2k+", label: "Active Users" },
  { value: "94%", label: "Success Rate" },
];

const H_BG = "linear-gradient(160deg,#2D1B69 0%,#1A0F3E 100%)";
const L_BG = "linear-gradient(135deg,#7C3AED,#3B82F6)";
const B_BG = "linear-gradient(135deg,#7C3AED,#6D28D9)";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-[#F4F5FA]">

      <header className="flex shrink-0 items-center justify-between px-6 py-4" style={{ background: H_BG }}>
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl shadow-lg" style={{ background: L_BG }}>
            <Rocket className="size-4 text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold leading-tight tracking-tight text-white">JobPilot</p>
            <p className="text-[10px] text-purple-300/80">Navigate your dream career ✨</p>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-medium text-purple-200/80 hover:bg-white/10 hover:text-white">
            Log In
          </Link>
          <Link href="/signup" className="rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-90" style={{ background: B_BG }}>
            Get Started
          </Link>
        </nav>
      </header>

      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[480px] w-[600px] -translate-x-1/2 rounded-full opacity-20 blur-3xl" style={{ background: "radial-gradient(circle,#7C3AED 0%,transparent 70%)" }} />
        <div className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-purple-700" style={{ background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.25)" }}>
          <span className="size-1.5 rounded-full" style={{ background: "linear-gradient(135deg,#A78BFA,#7C3AED)" }} />
          Free · Private · AI-Powered
        </div>
        <h1 className="mt-1 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
          Your Job Search,{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: L_BG }}>
            Command Center
          </span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-500 sm:text-lg">
          Save jobs with one click, track every application, and get AI insights on your fit — all in one place.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/signup" className="rounded-xl px-8 py-3.5 text-sm font-semibold text-white shadow-lg hover:opacity-90" style={{ background: B_BG }}>
            Get Started — It&apos;s Free
          </Link>
          <Link href="/login" className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
            Log In
          </Link>
        </div>
        <div className="mt-12 flex items-center gap-10">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl font-extrabold bg-clip-text text-transparent" style={{ backgroundImage: L_BG }}>{s.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shrink-0 border-t border-slate-200/60 bg-white px-6 py-10">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-purple-500">Everything you need</p>
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md">
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-sm`}>
                <f.icon className="size-4 text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800">{f.title}</span>
                  {f.comingSoon && (
                    <span className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold leading-none text-purple-600" style={{ background: "rgba(124,58,237,0.10)" }}>soon</span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="shrink-0 px-6 py-4 text-center text-xs text-purple-300/60" style={{ background: H_BG }}>
        © {new Date().getFullYear()} JobPilot · Navigate your dream career ✨ ·{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-purple-200">Privacy Policy</Link>
      </footer>

    </main>
  );
}
