import Link from "next/link";
import { BarChart3, Bot, Briefcase, Folders, Lock, MousePointerClick, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const features = [
  { icon: MousePointerClick, title: "One-Click Capture", description: "Save any job posting instantly from your browser" },
  { icon: Bot, title: "AI Suitability Analysis", description: "Know your fit before you apply" },
  { icon: BarChart3, title: "Smart Dashboard", description: "Track status, deadlines, and priorities at a glance" },
  { icon: Folders, title: "Multi-Category", description: "Organize by country, role type, or company" },
  { icon: Lock, title: "Secure & Private", description: "Your data stays yours, protected by login" },
  { icon: PenLine, title: "Resume Optimizer", description: "Tailor your CV to each job with AI assistance", comingSoon: true },
];

export default function LandingPage() {
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500 text-white">
            <Briefcase className="size-4" />
          </span>
          <span className="text-lg">JobPilot</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
          >
            Sign Up Free →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
          🚀 Free · Private · AI-Powered
        </div>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
          Your Job Search,{" "}
          <span className="text-blue-500">Command Center</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-500 sm:text-lg">
          Save jobs with one click, track every application, and get AI insights on your fit — all in one place. Built for serious job seekers.
        </p>
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-xl bg-blue-500 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 transition-colors"
          >
            Get Started — It&apos;s Free
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-slate-300 bg-white px-8 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Log In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="shrink-0 border-t border-slate-200 bg-white/60 px-6 py-5">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3">
              <feature.icon className="size-4 text-blue-500" />
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs font-semibold text-slate-800">{feature.title}</span>
                {feature.comingSoon ? (
                  <Badge className="bg-blue-50 text-blue-500 text-[10px] px-1.5 py-0">soon</Badge>
                ) : null}
              </div>
              <p className="text-[11px] leading-4 text-slate-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
