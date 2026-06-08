"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Briefcase } from "lucide-react";

import {
  addCategory,
  addJob,
  getCategories,
  logInUser,
  saveUserProfile,
  signUpUser,
} from "@/lib/jobpilot-store";

const DEMO_EMAIL = "demo@jobpilot.app";
const DEMO_PASSWORD = "Demo123456";
const IS_DEV = process.env.NODE_ENV === "development";

async function ensureDemoAccount() {
  const loginResult = await logInUser(DEMO_EMAIL, DEMO_PASSWORD);
  if (loginResult.ok) return loginResult.user;

  const signupResult = await signUpUser({
    name: "Demo User",
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (!signupResult.ok) return null;
  const user = signupResult.user;

  // Create categories
  for (const name of ["Germany - Software", "Germany - Data", "EU - Product"]) {
    addCategory(user.id, name);
  }
  const categories = getCategories(user.id);
  const swCat = categories.find((c) => c.name === "Germany - Software");
  const daCat = categories.find((c) => c.name === "Germany - Data");
  const prCat = categories.find((c) => c.name === "EU - Product");

  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const daysFromNow = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  if (swCat) {
    const swJobs = [
      { title: "Frontend Engineer", company: "SAP SE", status: "Applied" as const, priority: "High" as const, link: "https://sap.com/careers", deadline: daysFromNow(12), dateAdded: daysAgo(8), comments: "Applied via company site. Referral from LinkedIn contact." },
      { title: "Full Stack Developer", company: "Zalando", status: "Interview" as const, priority: "Super High" as const, link: "https://zalando.de/jobs", deadline: daysFromNow(5), dateAdded: daysAgo(14), comments: "Phone screen done. Technical round scheduled for next week." },
      { title: "React Developer", company: "Siemens Digital", status: "In Progress" as const, priority: "Medium" as const, deadline: daysFromNow(20), dateAdded: daysAgo(3) },
      { title: "TypeScript Engineer", company: "Bosch", status: "Rejected" as const, priority: "Low" as const, dateAdded: daysAgo(21), comments: "Position filled internally." },
      { title: "Next.js Developer", company: "OttoGroup", status: "In Progress" as const, priority: "High" as const, link: "https://ottogroup.com", deadline: daysFromNow(8), dateAdded: daysAgo(2) },
      { title: "Vue.js Developer", company: "Volkswagen Digital", status: "Applied" as const, priority: "Medium" as const, dateAdded: daysAgo(5), deadline: daysFromNow(15) },
      { title: "Senior Software Engineer", company: "Deutsche Bank Tech", status: "Look Again" as const, priority: "High" as const, dateAdded: daysAgo(10), comments: "Salary range too low. Will re-evaluate if they adjust." },
      { title: "Platform Engineer", company: "Delivery Hero", status: "Applied" as const, priority: "Medium" as const, link: "https://careers.deliveryhero.com", dateAdded: daysAgo(1) },
      { title: "Backend Developer (Node.js)", company: "N26", status: "Interview" as const, priority: "Super High" as const, deadline: daysFromNow(3), dateAdded: daysAgo(18), comments: "2nd interview round. Very excited about this role!" },
      { title: "Software Architect", company: "ThyssenKrupp Digital", status: "Not Suitable" as const, priority: "Low" as const, dateAdded: daysAgo(30), comments: "Required 10+ years in aerospace domain." },
    ];
    for (const job of swJobs) addJob(user.id, { categoryId: swCat.id, ...job });
  }

  if (daCat) {
    const daJobs = [
      { title: "Data Analyst", company: "Deutsche Telekom", status: "Applied" as const, priority: "Medium" as const, dateAdded: daysAgo(7), deadline: daysFromNow(10) },
      { title: "ML Engineer", company: "Allianz", status: "In Progress" as const, priority: "High" as const, link: "https://allianz.de/jobs", dateAdded: daysAgo(4), deadline: daysFromNow(18), comments: "Great company culture. Python + AWS stack." },
      { title: "Data Scientist", company: "BMW Group", status: "Look Again" as const, priority: "Low" as const, dateAdded: daysAgo(15), comments: "Requires relocation to Munich. Will consider later." },
      { title: "Data Engineer", company: "Lufthansa Systems", status: "Applied" as const, priority: "Medium" as const, dateAdded: daysAgo(6), deadline: daysFromNow(9) },
      { title: "AI Research Scientist", company: "Fraunhofer Institute", status: "In Progress" as const, priority: "Super High" as const, dateAdded: daysAgo(2), deadline: daysFromNow(25), comments: "Research role with publication opportunities. Very aligned with my interests." },
      { title: "BI Developer", company: "Daimler Truck", status: "Not Suitable" as const, priority: "Low" as const, dateAdded: daysAgo(22), comments: "Mostly Tableau/Power BI. Looking for more Python-heavy roles." },
      { title: "Analytics Engineer", company: "Westwing", status: "Applied" as const, priority: "High" as const, dateAdded: daysAgo(3), deadline: daysFromNow(7) },
      { title: "MLOps Engineer", company: "ING Germany", status: "Interview" as const, priority: "High" as const, dateAdded: daysAgo(11), deadline: daysFromNow(2), comments: "Final round interview. Strong candidate according to HR." },
    ];
    for (const job of daJobs) addJob(user.id, { categoryId: daCat.id, ...job });
  }

  if (prCat) {
    const prJobs = [
      { title: "Product Manager", company: "Spotify Berlin", status: "Applied" as const, priority: "High" as const, link: "https://spotify.com/jobs", dateAdded: daysAgo(9), deadline: daysFromNow(14), comments: "Dream company. Applied with strong cover letter." },
      { title: "Product Analyst", company: "Klarna", status: "Interview" as const, priority: "Medium" as const, dateAdded: daysAgo(16), deadline: daysFromNow(4), comments: "First round passed. Case study round next." },
      { title: "UX Researcher", company: "HelloFresh", status: "In Progress" as const, priority: "Low" as const, dateAdded: daysAgo(5) },
      { title: "Growth Product Manager", company: "Wolt", status: "Expired/Filled" as const, priority: "Medium" as const, dateAdded: daysAgo(35), comments: "Deadline passed. Position has been filled." },
      { title: "Senior Product Manager", company: "Booking.com Amsterdam", status: "Applied" as const, priority: "Super High" as const, dateAdded: daysAgo(1), deadline: daysFromNow(21) },
      { title: "Product Lead", company: "Miro", status: "Offer" as const, priority: "Super High" as const, dateAdded: daysAgo(5), deadline: daysFromNow(14), comments: "Offer received! Negotiating terms." },
    ];
    for (const job of prJobs) addJob(user.id, { categoryId: prCat.id, ...job });
  }

  // Seed a demo profile
  saveUserProfile({
    userId: user.id,
    fullName: "Alex Müller",
    phone: "+49 176 12345678",
    location: "Berlin, Germany",
    linkedin: "linkedin.com/in/alex-mueller",
    website: "alexmueller.dev",
    summary:
      "Full-stack software engineer with 5+ years of experience building scalable web applications. Passionate about React, TypeScript, and cloud-native architectures. Currently seeking roles in Berlin's vibrant tech scene.",
    skills: [
      "TypeScript", "React", "Next.js", "Node.js", "Python",
      "PostgreSQL", "Docker", "Kubernetes", "AWS", "GraphQL",
      "Git", "CI/CD", "REST APIs", "Agile/Scrum",
    ],
    experience: [
      {
        id: "exp1",
        company: "TechStartup GmbH",
        title: "Senior Frontend Developer",
        startDate: "2022-03",
        location: "Berlin, Germany",
        description:
          "Led frontend architecture for a B2B SaaS platform serving 50k+ users. Migrated codebase from React class components to TypeScript + hooks, reducing bugs by 35%. Mentored 3 junior developers.",
      },
      {
        id: "exp2",
        company: "DigitalAgency Berlin",
        title: "Full Stack Developer",
        startDate: "2019-06",
        endDate: "2022-02",
        location: "Berlin, Germany",
        description:
          "Developed and maintained 10+ client projects using React, Node.js, and PostgreSQL. Built a real-time dashboard using WebSockets, improving client reporting efficiency by 60%.",
      },
    ],
    education: [
      {
        id: "edu1",
        institution: "Technische Universität Berlin",
        degree: "Master of Science",
        field: "Computer Science",
        startDate: "2017-10",
        endDate: "2019-09",
      },
      {
        id: "edu2",
        institution: "Universität Hamburg",
        degree: "Bachelor of Science",
        field: "Informatics",
        startDate: "2014-10",
        endDate: "2017-09",
      },
    ],
    languages: [
      { language: "German", level: "Native" },
      { language: "English", level: "Fluent (C1)" },
      { language: "Spanish", level: "Basic (A2)" },
    ],
    certifications: [
      "AWS Certified Developer – Associate",
      "Google Cloud Professional Data Engineer",
    ],
    cvText:
      "Alex Müller | Senior Full Stack Developer | Berlin, Germany\n\nSUMMARY\nFull-stack software engineer with 5+ years of experience...\n\n[Full CV text would be here after uploading your actual CV]",
    updatedAt: new Date().toISOString(),
  });

  return user;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const result = await logInUser(email, password);
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    router.push("/jobs");
  }

  async function handleDemo() {
    setError("");
    setLoading(true);
    const user = await ensureDemoAccount();
    setLoading(false);
    if (!user) { setError("Could not load demo account."); return; }
    router.push("/jobs");
  }

  return (
    <main className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500 text-white">
              <Briefcase className="size-6" />
            </div>
            <h1 className="mt-3 text-xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-500">Log in to your job command center</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
              <input
                id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
              <input
                id="password" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
                placeholder="••••••••"
              />
            </div>
            {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
            <button
              type="submit" disabled={loading}
              className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60 transition-colors"
            >
              {loading ? "Logging in…" : "Log In"}
            </button>
          </form>

          {/* Demo button — development only */}
          {IS_DEV && (
            <>
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">dev only</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <button
                type="button" onClick={handleDemo} disabled={loading}
                className="w-full rounded-lg border border-dashed border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-60 transition-colors"
              >
                🧪 Try Demo Account
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">
                <span className="font-mono">demo@jobpilot.app</span> / Demo123456
              </p>
            </>
          )}

          <p className="mt-5 text-center text-sm text-slate-500">
            No account?{" "}
            <Link href="/signup" className="font-medium text-blue-500 hover:underline">Sign up free</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
