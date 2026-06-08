"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Category,
  fetchCategories,
  fetchJobs,
  JOB_PRIORITIES,
  JOB_STATUSES,
  JobWithCategory,
} from "@/lib/api";

const statusColors: Record<string, string> = {
  "In Progress": "#f97316",
  Applied: "#3b82f6",
  Interview: "#8b5cf6",
  "Look Again": "#f59e0b",
  Rejected: "#ef4444",
  "Not Suitable": "#94a3b8",
  "Expired/Filled": "#cbd5e1",
};

function startOfWeek(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function weekKey(date: Date) {
  const week = startOfWeek(date);
  return week.toISOString().slice(0, 10);
}

function weekLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function countBy(items: JobWithCategory[], key: keyof JobWithCategory, order?: readonly string[]) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const value = String(item[key] || "Unknown");
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  const labels = order || Array.from(counts.keys()).sort();
  return labels.map((label) => ({ label, count: counts.get(label) || 0 }));
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function monthLabel(key: string) {
  const d = new Date(`${key}-01T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export default function AnalyticsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [jobs, setJobs] = useState<JobWithCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    Promise.all([
      fetchCategories(),
      fetchJobs({ limit: 1000 }),
    ]).then(([cats, jobsResp]) => {
      setCategories(cats);
      setJobs(jobsResp.jobs);
    }).catch(() => {});
  }, []);

  const filteredJobs = useMemo(() => {
    if (categoryFilter === "All") return jobs;
    return jobs.filter((job) => job.categoryId === categoryFilter);
  }, [categoryFilter, jobs]);

  // ── KPI Calculations ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const applications = filteredJobs.filter((j) =>
      ["Applied", "Interview", "Offer", "Rejected"].includes(j.status)
    ).length;
    const interviews = filteredJobs.filter((j) => j.status === "Interview").length;
    const offers = filteredJobs.filter((j) => j.status === "Offer").length;
    const active = filteredJobs.filter((j) =>
      ["Applied", "Interview"].includes(j.status)
    ).length;
    const interviewRate = applications > 0 ? (interviews / applications) * 100 : 0;
    const offerRate = applications > 0 ? (offers / applications) * 100 : 0;
    return { applications, interviews, offers, active, interviewRate, offerRate };
  }, [filteredJobs]);

  // ── Funnel ────────────────────────────────────────────────────────────────
  const funnelData = useMemo(() => {
    const stages = [
      { name: "Saved", statuses: ["In Progress", "Look Again"] },
      { name: "Applied", statuses: ["Applied"] },
      { name: "Interview", statuses: ["Interview"] },
      { name: "Offer", statuses: ["Offer"] },
      { name: "Rejected", statuses: ["Rejected", "Not Suitable", "Expired/Filled"] },
    ];
    return stages.map((s) => ({
      name: s.name,
      count: filteredJobs.filter((j) => s.statuses.includes(j.status)).length,
      fill: s.name === "Saved" ? "#f97316" : s.name === "Applied" ? "#3b82f6" : s.name === "Interview" ? "#8b5cf6" : s.name === "Offer" ? "#10b981" : "#ef4444",
    }));
  }, [filteredJobs]);

  const resumePerf: never[] = [];

  const bestResume = useMemo(() => {
    if (!resumePerf.length) return null;
    return resumePerf.sort((a, b) => b.interviews - a.interviews)[0];
  }, [resumePerf]);

  // ── Category Performance ───────────────────────────────────────────────────
  const catPerf = useMemo(() => {
    const counts = new Map<string, { apps: number; ints: number; offs: number }>();
    filteredJobs.forEach((j) => {
      const cat = j.categoryName || "Uncategorized";
      const entry = counts.get(cat) || { apps: 0, ints: 0, offs: 0 };
      if (["Applied", "Interview", "Offer", "Rejected"].includes(j.status)) entry.apps++;
      if (j.status === "Interview") entry.ints++;
      if (j.status === "Offer") entry.offs++;
      counts.set(cat, entry);
    });
    return Array.from(counts.entries())
      .map(([name, d]) => ({
        name,
        applications: d.apps,
        interviews: d.ints,
        offers: d.offs,
        interviewRate: d.apps > 0 ? ((d.ints / d.apps) * 100).toFixed(1) : "0.0",
      }))
      .sort((a, b) => b.applications - a.applications);
  }, [filteredJobs]);

  // ── Company Response ──────────────────────────────────────────────────────
  const companyInterviewData = useMemo(() => {
    const counts = new Map<string, number>();
    filteredJobs.filter((j) => j.status === "Interview" && j.company?.trim()).forEach((j) => {
      const c = j.company!.trim();
      counts.set(c, (counts.get(c) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([company, count]) => ({ company, count }));
  }, [filteredJobs]);

  // ── Monthly Trends ────────────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const months = new Map<string, { apps: number; ints: number; offs: number }>();
    const now = new Date();
    // Create last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      months.set(key, { apps: 0, ints: 0, offs: 0 });
    }
    filteredJobs.forEach((j) => {
      const mk = monthKey(j.dateAdded);
      if (!months.has(mk)) return;
      const entry = months.get(mk)!;
      if (["Applied", "Interview", "Offer", "Rejected"].includes(j.status)) entry.apps++;
      if (j.status === "Interview") entry.ints++;
      if (j.status === "Offer") entry.offs++;
    });
    return Array.from(months.entries()).map(([key, d]) => ({
      month: monthLabel(key),
      applications: d.apps,
      interviews: d.ints,
      offers: d.offs,
      interviewRate: d.apps > 0 ? +((d.ints / d.apps) * 100).toFixed(1) : 0,
    }));
  }, [filteredJobs]);

  // ── Status Summary ────────────────────────────────────────────────────────
  const statusSummary = useMemo(() => countBy(filteredJobs, "status", JOB_STATUSES), [filteredJobs]);

  // ── Existing chart data ───────────────────────────────────────────────────
  const statusData = useMemo(() => countBy(filteredJobs, "status", JOB_STATUSES), [filteredJobs]);
  const priorityData = useMemo(() => countBy(filteredJobs, "priority", JOB_PRIORITIES), [filteredJobs]);
  const companyData = useMemo(() => {
    const counts = new Map<string, number>();
    filteredJobs.forEach((job) => {
      const company = job.company?.trim();
      if (!company) return;
      counts.set(company, (counts.get(company) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([company, count]) => ({ company, count }));
  }, [filteredJobs]);

  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks = Array.from({ length: 12 }, (_, index) => {
      const start = startOfWeek(now);
      start.setDate(start.getDate() - (11 - index) * 7);
      const key = start.toISOString().slice(0, 10);
      return {
        week: key,
        label: weekLabel(key),
        ...Object.fromEntries(JOB_STATUSES.map((status) => [status, 0])),
      } as Record<string, string | number>;
    });
    const byWeek = new Map(weeks.map((item) => [item.week, item]));
    filteredJobs.forEach((job) => {
      const date = new Date(`${job.dateAdded}T00:00:00`);
      if (Number.isNaN(date.getTime())) return;
      const bucket = byWeek.get(weekKey(date));
      if (!bucket) return;
      bucket[job.status] = Number(bucket[job.status] || 0) + 1;
    });
    return weeks;
  }, [filteredJobs]);

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Analytics Dashboard</h2>
          <p className="text-sm text-slate-500">
            {filteredJobs.length} job{filteredJobs.length === 1 ? "" : "s"} in this view
          </p>
        </div>
        <select
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="All">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-3">
          <span className="text-xs text-slate-500 font-medium">Applications</span>
          <span className="text-2xl font-bold text-blue-600">{kpis.applications}</span>
          <span className="text-xs text-slate-400">Applied + Interview + Offer + Rejected</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-3">
          <span className="text-xs text-slate-500 font-medium">Interviews</span>
          <span className="text-2xl font-bold text-violet-600">{kpis.interviews}</span>
          <span className="text-xs text-slate-400">Currently in Interview</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-3">
          <span className="text-xs text-slate-500 font-medium">Offers</span>
          <span className="text-2xl font-bold text-emerald-600">{kpis.offers}</span>
          <span className="text-xs text-slate-400">Offer received</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-3">
          <span className="text-xs text-slate-500 font-medium">Interview Rate</span>
          <span className="text-2xl font-bold text-amber-600">{kpis.interviewRate.toFixed(1)}%</span>
          <span className="text-xs text-slate-400">{kpis.interviews} ÷ {kpis.applications}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-3">
          <span className="text-xs text-slate-500 font-medium">Offer Rate</span>
          <span className="text-2xl font-bold text-slate-700">{kpis.offerRate.toFixed(1)}%</span>
          <span className="text-xs text-slate-400">{kpis.offers} ÷ {kpis.applications}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-3">
          <span className="text-xs text-slate-500 font-medium">Active Pipeline</span>
          <span className="text-2xl font-bold text-blue-500">{kpis.active}</span>
          <span className="text-xs text-slate-400">Applied + Interview</span>
        </div>
      </div>

      {/* ── Application Funnel + Best Resume + Status Summary ── */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Funnel */}
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Application Funnel</CardTitle>
            <CardDescription>Pipeline health at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {funnelData.map((stage, i) => (
                <div key={stage.name}>
                  <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full" style={{ backgroundColor: stage.fill }} />
                      <span className="text-sm font-medium text-slate-700">{stage.name}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{stage.count}</span>
                  </div>
                  {i < funnelData.length - 1 && (
                    <div className="flex justify-center py-0.5">
                      <svg className="size-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Best Resume */}
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Best Performing Resume</CardTitle>
            <CardDescription>Resume version with most interviews</CardDescription>
          </CardHeader>
          <CardContent>
            {bestResume ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{bestResume.resume.name}</p>
                  <p className="text-xs text-slate-400">Version {bestResume.resume.versionNumber}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md bg-blue-50 p-2 text-center">
                    <p className="text-lg font-bold text-blue-600">{bestResume.applications}</p>
                    <p className="text-[10px] text-blue-500">Apps</p>
                  </div>
                  <div className="rounded-md bg-violet-50 p-2 text-center">
                    <p className="text-lg font-bold text-violet-600">{bestResume.interviews}</p>
                    <p className="text-[10px] text-violet-500">Interviews</p>
                  </div>
                  <div className="rounded-md bg-emerald-50 p-2 text-center">
                    <p className="text-lg font-bold text-emerald-600">{bestResume.offers}</p>
                    <p className="text-[10px] text-emerald-500">Offers</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Interview Rate: <strong>{bestResume.applications > 0 ? ((bestResume.interviews / bestResume.applications) * 100).toFixed(1) : "0.0"}%</strong>
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-4 text-center">Link a resume to a job to see performance.</p>
            )}
          </CardContent>
        </Card>

        {/* Status Summary */}
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Job Status Insights</CardTitle>
            <CardDescription>Breakdown of all statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {statusSummary.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full" style={{ backgroundColor: statusColors[s.label] || "#94a3b8" }} />
                    <span className="text-slate-600">{s.label}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Resume Performance Table ────────────────────────── */}
      {resumePerf.length > 0 && (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Resume Performance</CardTitle>
            <CardDescription>Which resume versions are driving results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="py-2 pr-3">Resume Version</th>
                    <th className="py-2 pr-3 text-right">Applications</th>
                    <th className="py-2 pr-3 text-right">Interviews</th>
                    <th className="py-2 pr-3 text-right">Offers</th>
                    <th className="py-2 pr-3 text-right">Interview Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {resumePerf.map((r) => (
                    <tr key={r.resume.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 font-medium text-slate-900">{r.resume.name} v{r.resume.versionNumber}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{r.applications}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{r.interviews}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{r.offers}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{r.applications > 0 ? ((r.interviews / r.applications) * 100).toFixed(1) : "0.0"}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Category Performance ────────────────────────────── */}
      {catPerf.length > 1 && (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
            <CardDescription>Interview rates by job category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3 text-right">Applications</th>
                    <th className="py-2 pr-3 text-right">Interviews</th>
                    <th className="py-2 pr-3 text-right">Offers</th>
                    <th className="py-2 pr-3 text-right">Interview Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {catPerf.map((c) => (
                    <tr key={c.name} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 font-medium text-slate-900">{c.name}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{c.applications}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{c.interviews}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{c.offers}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{c.interviewRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Company Response & Monthly Trends ──────────────── */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Top Interview-Producing Companies */}
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Top Interview-Producing Companies</CardTitle>
            <CardDescription>Which companies respond most often</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {companyInterviewData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={companyInterviewData} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="company" width={90} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">No interviews yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>Applications, interviews, and offers per month</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="applications" stroke="#3b82f6" strokeWidth={2} dot={false} name="Applications" />
                <Line type="monotone" dataKey="interviews" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Interviews" />
                <Line type="monotone" dataKey="offers" stroke="#10b981" strokeWidth={2} dot={false} name="Offers" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Interview Conversion Trend ──────────────────────── */}
      {monthlyData.some((m) => m.interviewRate > 0) && (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Interview Conversion Trend</CardTitle>
            <CardDescription>How your interview rate is changing over time</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, "auto"]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Line type="monotone" dataKey="interviewRate" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Interview Rate" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Missing Skills Section */}
      {filteredJobs.some((j) => j.notes) && (() => {
        // Aggregate skills from saved analyses attached to jobs (stored in note field)
        const skillCounts = new Map<string, number>();
        const skippedPattern = /"missing"\s*:\s*\[([^\]]+)\]/gi;
        filteredJobs.forEach((j) => {
          if (j.notes) {
            const match = skippedPattern.exec(j.notes);
            if (match) {
              const skills = match[1].match(/"([^"]+)"/g);
              skills?.forEach((s) => {
                const cleaned = s.replace(/"/g, "").trim();
                if (cleaned) skillCounts.set(cleaned, (skillCounts.get(cleaned) || 0) + 1);
              });
            }
          }
        });
        const topMissing = Array.from(skillCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8);
        return topMissing.length > 0 ? (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Most Frequently Missing Skills</CardTitle>
              <CardDescription>Skills you're most often missing in applications</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {topMissing.map(([skill, count]) => (
                <div key={skill} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 border border-red-100">
                  <span>{skill}</span>
                  <span className="text-red-400">{count} jobs</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* ── Existing Charts ────────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Status breakdown</CardTitle>
            <CardDescription>Current pipeline by application status.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={110} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Priority breakdown</CardTitle>
            <CardDescription>How your attention is distributed.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={110} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-lg xl:col-span-2">
          <CardHeader>
            <CardTitle>Applications over time</CardTitle>
            <CardDescription>Weekly additions grouped by status.</CardDescription>
          </CardHeader>
          <CardContent className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {JOB_STATUSES.map((status) => (
                  <Line
                    key={status}
                    type="monotone"
                    dataKey={status}
                    stroke={statusColors[status]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-lg xl:col-span-2">
          <CardHeader>
            <CardTitle>Top companies</CardTitle>
            <CardDescription>Companies appearing most often in your tracker.</CardDescription>
          </CardHeader>
          <CardContent className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={companyData} margin={{ bottom: 42 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="company" angle={-25} textAnchor="end" interval={0} height={70} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}