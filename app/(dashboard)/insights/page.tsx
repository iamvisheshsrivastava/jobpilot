"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3, BookOpen, Brain, Briefcase, Code2, Database, FileText,
  Lightbulb, Server, Sparkles, Target, TrendingUp, Users, Zap,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, getUserProfile, getResumes } from "@/lib/jobpilot-store";
import {
  generatePortfolioIntelligence,
  PortfolioIntelligence,
  TechnologyEvidence,
  DomainStrength,
  CareerReadiness,
  GapAnalysis,
} from "@/lib/portfolio-intelligence";

const levelColors: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-700 border-emerald-200",
  moderate: "bg-amber-100 text-amber-700 border-amber-200",
  weak: "bg-red-100 text-red-700 border-red-200",
  none: "bg-slate-100 text-slate-500 border-slate-200",
};

const gapColors: Record<string, string> = {
  none: "bg-emerald-100 text-emerald-700",
  low: "bg-blue-100 text-blue-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const matchColors: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-700 border-emerald-300",
  moderate: "bg-amber-100 text-amber-700 border-amber-300",
  weak: "bg-red-100 text-red-700 border-red-300",
};

export default function InsightsPage() {
  const router = useRouter();
  const [user, setUser] = useState(getCurrentUser());
  const [intel, setIntel] = useState<PortfolioIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    const profile = getUserProfile(user.id);
    const resumes = getResumes(user.id);
    // Only run if user has data
    if (!profile.skills?.length && !profile.cvText && !resumes.length && !profile.experience?.length) {
      setIntel(null);
      setLoading(false);
      return;
    }
    // Small delay to simulate analysis
    const timer = setTimeout(() => {
      const result = generatePortfolioIntelligence(user.id);
      setIntel(result);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [user]);

  // ── Section highlights ──
  const topTechs = useMemo(() => intel?.summary.technologies.filter((t) => t.level === "strong").slice(0, 12) || [], [intel]);
  const topDomains = useMemo(() => intel?.summary.domains.filter((d) => d.projectCount > 0).slice(0, 8) || [], [intel]);

  const strongRoles = useMemo(() => intel?.careerReadiness.filter((r) => r.match === "strong") || [], [intel]);
  const moderateRoles = useMemo(() => intel?.careerReadiness.filter((r) => r.match === "moderate") || [], [intel]);
  const weakRoles = useMemo(() => intel?.careerReadiness.filter((r) => r.match === "weak") || [], [intel]);

  const highGaps = useMemo(() => intel?.gapAnalysis.filter((g) => g.gap === "high") || [], [intel]);
  const noGaps = useMemo(() => intel?.gapAnalysis.filter((g) => g.gap === "none") || [], [intel]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-violet-100">
            <Brain className="size-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold">AI Resume Intelligence</h2>
            <p className="text-sm text-slate-500">
              {intel
                ? `Understanding your portfolio across ${intel.summary.projects.length} projects`
                : loading
                  ? "Analyzing your profile..."
                  : "Add profile data to unlock insights"}
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Brain className="size-10 text-violet-400 animate-pulse" />
            <p className="text-sm text-slate-400">Analyzing your technical portfolio...</p>
          </div>
        </div>
      )}

      {!loading && !intel && (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
          <FileText className="size-10" />
          <p className="text-sm">No profile data found. Complete your profile and upload resumes to get insights.</p>
        </div>
      )}

      {intel && (
        <>
          {/* ── Section Navigation ── */}
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 flex-wrap">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "technologies", label: "Technologies", icon: Code2 },
              { id: "domains", label: "Project Domains", icon: BookOpen },
              { id: "gaps", label: "Gap Analysis", icon: Target },
              { id: "career", label: "Career Readiness", icon: TrendingUp },
              { id: "recommendations", label: "Recommendations", icon: Lightbulb },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeSection === tab.id ? "bg-violet-50 text-violet-600" : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setActiveSection(tab.id)}
              >
                <tab.icon className="size-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW ──────────────────────────────────── */}
          {activeSection === "overview" && (
            <div className="space-y-4">
              {/* Primary Focus Card */}
              <div className="rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5">
                <div className="flex items-center gap-3">
                  <Zap className="size-6 text-violet-500" />
                  <div>
                    <p className="text-xs text-violet-600 font-medium uppercase tracking-wider">Primary Focus</p>
                    <p className="text-xl font-bold text-violet-900">{intel.summary.primaryFocus}</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500 font-medium">Projects Analyzed</p>
                  <p className="text-2xl font-bold text-slate-900">{intel.summary.projects.length}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500 font-medium">Technologies Detected</p>
                  <p className="text-2xl font-bold text-slate-900">{intel.summary.technologies.length}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500 font-medium">Strong Domains</p>
                  <p className="text-2xl font-bold text-emerald-600">{intel.summary.domains.filter((d) => d.level === "strong").length}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500 font-medium">Career Matches (Strong)</p>
                  <p className="text-2xl font-bold text-violet-600">{strongRoles.length}</p>
                </div>
              </div>

              {/* Strong Areas / Weak Areas */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Strong Areas</CardTitle>
                    <CardDescription>Domains with substantial evidence</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {intel.summary.strongAreas.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {intel.summary.strongAreas.map((area) => (
                          <span key={area} className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                            {area}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No strong areas detected yet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Areas to Develop</CardTitle>
                    <CardDescription>Domains with limited evidence</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {intel.summary.weakAreas.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {intel.summary.weakAreas.map((area) => (
                          <span key={area} className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                            {area}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No gaps identified.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Technology Cloud (Strong) */}
              {topTechs.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Strong Technologies</CardTitle>
                    <CardDescription>Technologies with the most evidence</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {topTechs.map((tech) => (
                        <span key={tech.name} className={`inline-block rounded-full px-3 py-1 text-xs font-medium border ${levelColors[tech.level]}`}>
                          {tech.name}
                          <span className="ml-1.5 opacity-60">×{tech.occurrences}</span>
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Skill Demand */}
              {intel.skillDemand.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Most Frequently Missing Skills</CardTitle>
                    <CardDescription>Across all analyzed job descriptions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {intel.skillDemand.slice(0, 8).map((s) => (
                        <div key={s.skill} className="flex items-center justify-between">
                          <span className="text-sm text-slate-700 capitalize">{s.skill}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.min(s.frequency * 100, 100)}%` }} />
                            </div>
                            <span className="text-xs text-slate-400 w-8 text-right">{s.missingCount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── TECHNOLOGIES ──────────────────────────────── */}
          {activeSection === "technologies" && (
            <div className="space-y-4">
              {(["strong", "moderate", "weak"] as const).map((level) => {
                const techs = intel.summary.technologies.filter((t) => t.level === level);
                if (!techs.length) return null;
                return (
                  <Card key={level}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm capitalize">{level} Evidence</CardTitle>
                      <CardDescription>
                        {level === "strong" ? "5+ occurrences or 3+ sources" :
                         level === "moderate" ? "2+ occurrences or 1+ sources" :
                         "Limited evidence detected"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {techs.map((tech) => (
                          <div key={tech.name} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border ${levelColors[level]}`}>
                            <span>{tech.name}</span>
                            <span className="opacity-60">×{tech.occurrences}</span>
                            <span className="text-[10px] opacity-50">({tech.sources.join(", ")})</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ── DOMAINS ───────────────────────────────────── */}
          {activeSection === "domains" && (
            <div className="space-y-3">
              {topDomains.map((domain) => (
                <div key={domain.domain} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{domain.domain}</p>
                      <p className="text-xs text-slate-500">{domain.projectCount} project{domain.projectCount !== 1 ? "s" : ""}</p>
                    </div>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${levelColors[domain.level]}`}>
                      {domain.level === "strong" ? "Strong" : domain.level === "moderate" ? "Moderate" : "Limited"}
                    </span>
                  </div>
                  {domain.evidence.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {domain.evidence.slice(0, 4).map((e) => (
                        <span key={e} className="text-[10px] text-slate-400 bg-slate-50 rounded px-1.5 py-0.5">{e.slice(0, 40)}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── GAP ANALYSIS ──────────────────────────────── */}
          {activeSection === "gaps" && (
            <div className="space-y-4">
              {intel.gapAnalysis.length > 0 ? (
                <>
                  <p className="text-xs text-slate-500">Gap analysis compares your portfolio against job description requirements.</p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {intel.gapAnalysis.map((gap) => (
                      <div key={gap.domain} className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-slate-900">{gap.domain}</p>
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${gapColors[gap.gap]}`}>
                            {gap.gap === "none" ? "No Gap" : `${gap.gap.charAt(0).toUpperCase() + gap.gap.slice(1)} Gap`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{gap.explanation}</p>
                        {gap.found.length > 0 && (
                          <div className="mb-1">
                            <p className="text-[10px] text-emerald-600 font-medium mb-0.5">Found:</p>
                            <div className="flex flex-wrap gap-1">
                              {gap.found.map((t) => (
                                <span key={t} className="text-[10px] bg-emerald-50 text-emerald-700 rounded px-1.5 py-0.5">{t}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {gap.required.filter((t) => !gap.found.includes(t)).length > 0 && (
                          <div>
                            <p className="text-[10px] text-red-600 font-medium mb-0.5">Missing:</p>
                            <div className="flex flex-wrap gap-1">
                              {gap.required.filter((t) => !gap.found.includes(t)).map((t) => (
                                <span key={t} className="text-[10px] bg-red-50 text-red-700 rounded px-1.5 py-0.5">{t}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-slate-400">
                    No gap analysis available. Analyze a job description alongside your profile to identify gaps.
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── CAREER READINESS ──────────────────────────── */}
          {activeSection === "career" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">How your portfolio aligns with common industry roles. Based on evidence from your profile, not arbitrary scoring.</p>
              {intel.careerReadiness.map((role) => (
                <div key={role.role} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-900">{role.role}</p>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${matchColors[role.match]}`}>
                      {role.match === "strong" ? "Strong Match" : role.match === "moderate" ? "Moderate" : "Weak Match"}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] text-emerald-600 font-medium mb-0.5 uppercase tracking-wider">Evidence Found</p>
                      <div className="flex flex-wrap gap-1">
                        {role.evidence.map((e) => (
                          <span key={e} className="text-[10px] bg-emerald-50 text-emerald-700 rounded px-1.5 py-0.5">{e}</span>
                        ))}
                      </div>
                    </div>
                    {role.missing.length > 0 && (
                      <div>
                        <p className="text-[10px] text-red-600 font-medium mb-0.5 uppercase tracking-wider">Missing</p>
                        <div className="flex flex-wrap gap-1">
                          {role.missing.map((m) => (
                            <span key={m} className="text-[10px] bg-red-50 text-red-700 rounded px-1.5 py-0.5">{m}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── RECOMMENDATIONS ───────────────────────────── */}
          {activeSection === "recommendations" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">Actionable insights based on your portfolio, gaps, and career alignment.</p>
              {intel.recommendations.length > 0 ? (
                <div className="space-y-2">
                  {intel.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
                        {i + 1}
                      </div>
                      <p className="text-sm text-slate-700 pt-0.5">{rec}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-slate-400">
                    No recommendations available yet. Add more data to receive insights.
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}