"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface AnalyticsData {
  totals: {
    applied: number;
    interviews: number;
    offers: number;
    rejected: number;
    saved: number;
    interviewRate: number;
  };
  byResume: Array<{
    resumeName: string;
    applications: number;
    interviews: number;
    interviewRate: number;
  }>;
  byMonth: Array<{
    month: string;
    applied: number;
    interviews: number;
  }>;
  topCompanies: Array<{
    company: string;
    applications: number;
    status: string;
  }>;
}

const funnelStages = ["Saved", "Applied", "Interview", "Offer"] as const;
const funnelColors: Record<string, string> = {
  Saved: "#94a3b8",
  Applied: "#3b82f6",
  Interview: "#8b5cf6",
  Offer: "#10b981",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => res.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-slate-100" />
          ))}
        </div>
        <div className="h-72 rounded-lg bg-slate-100" />
        <div className="h-48 rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-sm text-slate-400">Failed to load analytics.</div>;
  }

  const { totals, byResume, byMonth, topCompanies } = data;

  // Funnel data for pipeline
  const funnelData = funnelStages.map((stage) => {
    let count = 0;
    if (stage === "Saved") count = totals.saved;
    if (stage === "Applied") count = totals.applied;
    if (stage === "Interview") count = totals.interviews;
    if (stage === "Offer") count = totals.offers;
    return { name: stage, count, fill: funnelColors[stage] };
  });

  // Interview rate color
  const rateColor =
    totals.interviewRate > 10
      ? "text-emerald-600"
      : totals.interviewRate > 5
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Analytics Dashboard</h2>

      {/* ── Section 1: Summary Cards ─────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4">
          <span className="text-xs font-medium text-slate-500">Total Applied</span>
          <span className="text-3xl font-bold text-blue-600">{totals.applied}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4">
          <span className="text-xs font-medium text-slate-500">Interviews</span>
          <span className="text-3xl font-bold text-violet-600">{totals.interviews}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4">
          <span className="text-xs font-medium text-slate-500">Interview Rate</span>
          <span className={`text-3xl font-bold ${rateColor}`}>
            {totals.interviewRate}%
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4">
          <span className="text-xs font-medium text-slate-500">Offers</span>
          <span className="text-3xl font-bold text-emerald-600">{totals.offers}</span>
        </div>
      </div>

      {/* ── Section 2: Applications Over Time ────────────────── */}
      {byMonth.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Applications Over Time</h3>
          <p className="mb-4 text-xs text-slate-400">Monthly applications and interviews</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="applied"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Applied"
                />
                <Line
                  type="monotone"
                  dataKey="interviews"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Interviews"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Section 3: Resume Performance Table ──────────────── */}
      {byResume.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Resume Performance</h3>
          <p className="mb-3 text-xs text-slate-400">Interview rates by resume version (sorted best first)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <th className="py-2 pr-4">Resume</th>
                  <th className="py-2 pr-4 text-right">Applications</th>
                  <th className="py-2 pr-4 text-right">Interviews</th>
                  <th className="py-2 pr-4 text-right">Interview Rate</th>
                </tr>
              </thead>
              <tbody>
                {byResume.map((r, i) => {
                  const isBest = i === 0 && r.interviewRate > 0;
                  return (
                    <tr
                      key={r.resumeName}
                      className={`border-b border-slate-100 last:border-0 ${
                        isBest ? "bg-emerald-50" : ""
                      }`}
                    >
                      <td className="py-2 pr-4 font-medium text-slate-900">
                        {r.resumeName}
                        {isBest && (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            Best
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right text-slate-700">{r.applications}</td>
                      <td className="py-2 pr-4 text-right text-slate-700">{r.interviews}</td>
                      <td className="py-2 pr-4 text-right font-semibold text-slate-900">
                        {r.interviewRate}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Section 4: Pipeline Funnel + Top Companies ──────── */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Funnel */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Pipeline Funnel</h3>
          <p className="mb-4 text-xs text-slate-400">Saved → Applied → Interview → Offer</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelData}
                layout="vertical"
                margin={{ left: 16, right: 32 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 13, fontWeight: 500 }}
                  stroke="#94a3b8"
                  width={80}
                />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={40}>
                  {funnelData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Companies */}
        {topCompanies.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-1 text-sm font-semibold text-slate-700">Top Companies</h3>
            <p className="mb-3 text-xs text-slate-400">Most applied companies</p>
            <div className="h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="py-2 pr-3">Company</th>
                    <th className="py-2 pr-3 text-right">Applications</th>
                    <th className="py-2 pr-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topCompanies.slice(0, 10).map((c) => (
                    <tr key={c.company} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 font-medium text-slate-900">{c.company}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{c.applications}</td>
                      <td className="py-2 pr-3 text-right text-slate-500 text-xs">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}