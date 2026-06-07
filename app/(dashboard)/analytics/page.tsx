"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  getCategories,
  getCurrentUser,
  getJobs,
  JOB_PRIORITIES,
  JOB_STATUSES,
  JobWithCategory,
} from "@/lib/jobpilot-store";

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

export default function AnalyticsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [jobs, setJobs] = useState<JobWithCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;
    setCategories(getCategories(user.id));
    setJobs(getJobs(user.id));
  }, []);

  const filteredJobs = useMemo(() => {
    if (categoryFilter === "All") return jobs;
    return jobs.filter((job) => job.categoryId === categoryFilter);
  }, [categoryFilter, jobs]);

  const statusData = useMemo(
    () => countBy(filteredJobs, "status", JOB_STATUSES),
    [filteredJobs],
  );
  const priorityData = useMemo(
    () => countBy(filteredJobs, "priority", JOB_PRIORITIES),
    [filteredJobs],
  );
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
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Application Analytics</h2>
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
