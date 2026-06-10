import Link from "next/link";
import {
  BarChart3, Bot, CheckCircle, Folders, Globe, Lock,
  MousePointerClick, PenLine, Rocket, Search, Sparkles, UserCheck,
} from "lucide-react";

const features = [
  { icon: MousePointerClick, title: "One-Click Capture", description: "Save any job posting instantly from your browser", color: "from-violet-500 to-purple-600" },
  { icon: Bot, title: "AI Suitability Analysis", description: "Know your fit before you apply", color: "from-blue-500 to-cyan-500" },
  { icon: BarChart3, title: "Smart Dashboard", description: "Track status, deadlines, and priorities at a glance", color: "from-emerald-500 to-teal-500" },
  { icon: Folders, title: "Multi-Category", description: "Organize by country, role type, or company", color: "from-amber-500 to-orange-500" },
  { icon: Lock, title: "Secure & Private", description: "Your data stays yours, protected by login", color: "from-rose-500 to-pink-500" },
  { icon: PenLine, title: "Resume Optimizer", description: "Tailor your CV to each job with AI assistance", color: "from-violet-500 to-indigo-500", comingSoon: true },
];

const steps = [
  {
    icon: Globe,
    step: "1",
    title: "Install the Extension",
    description: "Add JobPilot to Chrome (also works on Brave and Edge). It takes under 30 seconds.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Search,
    step: "2",
    title: "Browse Jobs Normally",
    description: "Go to LinkedIn, Indeed, Glassdoor, or any job board. Browse as you normally would.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: MousePointerClick,
    step: "3",
    title: "Click to Capture",
    description: "See a role you like? Click the JobPilot extension icon and hit 'Save Job'. Done.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Sparkles,
    step: "4",
    title: "Get AI Insights",
    description: "Instantly see your suitability score, skill gaps, and a tailored summary for the role.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: UserCheck,
    step: "5",
    title: "Track & Apply",
    description: "Manage every application from your dashboard — status, priority, deadlines, all in one place.",
    color: "from-rose-500 to-pink-500",
  },
];

const EXT_URL = "https://chromewebstore.google.com/detail/jobpilot/jopnkmmamkgaalnhkjamcpldmkiloeak";
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
        <div className="mt-10 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          <Globe className="size-4 shrink-0 text-amber-600" />
          <span><strong>Heads up:</strong> JobPilot works through a Chrome extension. Install it first to start saving jobs.</span>
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

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="shrink-0 border-t border-slate-200/60 bg-[#F4F5FA] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-purple-500">How it works</p>
          <h2 className="mb-10 text-center text-2xl font-extrabold text-slate-900 sm:text-3xl">
            From job listing to application tracker in seconds
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((s) => (
              <div key={s.step} className="relative flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} shadow-sm`}>
                    <s.icon className="size-4 text-white" />
                  </div>
                  <span className="text-xs font-bold text-slate-300">Step {s.step}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                <p className="text-[12px] leading-5 text-slate-500">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chrome Extension Install ─────────────────────────────────────── */}
      <section className="shrink-0 px-6 py-14" style={{ background: H_BG }}>
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold text-purple-300" style={{ background: "rgba(167,139,250,0.15)" }}>
            Required to get started
          </div>
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
            Install the Chrome Extension first
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-purple-200/80 max-w-xl mx-auto">
            JobPilot captures jobs directly from your browser — LinkedIn, Indeed, Glassdoor, company career pages, anywhere. The Chrome extension is what makes one-click saving possible. It&apos;s free and takes under 30 seconds to install.
          </p>
          <div className="mt-4 mx-auto max-w-lg rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-left text-sm text-purple-200/70">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-400">After installing:</p>
            <ul className="space-y-1.5">
              {[
                "Sign up or log in on this website",
                "Open the extension and log in with the same account",
                "Browse any job board and click the extension to save jobs",
                "Return to your dashboard here to track and analyse them",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 size-3.5 shrink-0 text-purple-400" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href={EXT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-xl px-7 py-3.5 text-sm font-semibold text-white shadow-lg hover:opacity-90"
              style={{ background: B_BG }}
            >
              <Globe className="size-4" />
              Add to Chrome — Free
            </a>
            <Link href="/signup" className="rounded-xl border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/20">
              Create Account
            </Link>
          </div>
          <p className="mt-3 text-xs text-purple-300/50">Works on Chrome, Brave, and Edge</p>
        </div>
      </section>

      <footer className="shrink-0 px-6 py-4 text-center text-xs text-purple-300/60" style={{ background: H_BG }}>
        © {new Date().getFullYear()} JobPilot · Navigate your dream career ✨ ·{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-purple-200">Privacy Policy</Link>
      </footer>

    </main>
  );
}
