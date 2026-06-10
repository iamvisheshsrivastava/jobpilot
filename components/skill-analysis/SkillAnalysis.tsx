"use client";

import { useState, useEffect } from "react";
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronRight,
  Lightbulb, Loader2, Minus, Sparkles, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  SkillAnalysisResult,
  buildSkillAnalysisSystemPrompt,
  buildSkillAnalysisUserPrompt,
  flattenProfile,
  parseSkillAnalysisResult,
} from "@/lib/skill-analysis";
import { callLLM } from "@/lib/llm";
import { fetchApiKeys } from "@/lib/api";

interface SkillAnalysisProps {
  compact?: boolean;
  initialResult?: SkillAnalysisResult | null;
  onResult?: (result: SkillAnalysisResult) => void;
}

export default function SkillAnalysis({ compact, initialResult, onResult }: SkillAnalysisProps) {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SkillAnalysisResult | null>(initialResult || null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  useEffect(() => {
    // Fetch profile from server (NextAuth+Prisma, not localStorage)
    fetch("/api/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setProfile(data))
      .catch(() => setProfile(null));
    fetchApiKeys().then((keys) => setHasApiKey(keys.length > 0)).catch(() => setHasApiKey(false));
  }, []);

  const parseJsonField = (v: unknown): unknown[] => {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") { try { return JSON.parse(v); } catch { return []; } }
    return [];
  };

  const profileComplete = profile && (
    profile.cvText ||
    parseJsonField(profile.skills).length > 0 ||
    parseJsonField(profile.experience).length > 0
  );

  async function handleAnalyze() {
    if (!profile || !jobDescription.trim()) return;
    setError("");
    setResult(null);
    setAnalyzing(true);
    setSuggestionsOpen(false);
    // Build a shape compatible with flattenProfile
    const normalizedProfile = {
      summary: profile.summary as string | undefined,
      cvText: profile.cvText as string | undefined,
      skills: parseJsonField(profile.skills) as string[],
      experience: parseJsonField(profile.experience) as { title?: string; company?: string; description?: string }[],
      education: parseJsonField(profile.education) as { degree?: string; field?: string; institution?: string }[],
      certifications: parseJsonField(profile.certifications) as string[],
    };
    const profileText = flattenProfile(normalizedProfile);
    const systemPrompt = buildSkillAnalysisSystemPrompt();
    const userPrompt = buildSkillAnalysisUserPrompt(jobDescription, profileText);
    const res = await callLLM("", systemPrompt, userPrompt);
    setAnalyzing(false);
    if (res.ok) {
      const parsed = parseSkillAnalysisResult(res.text);
      setResult(parsed);
      if (onResult) onResult(parsed);
    } else {
      setError(res.error);
    }
  }

  // Compact mode (extension)
  if (compact && result) {
    return (
      <div className="space-y-2">
        {result.matched.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-1">Matched ({result.matched.length})</p>
            <div className="flex flex-wrap gap-1">
              {result.matched.map((s) => (
                <span key={s} className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
                  <CheckCircle2 className="size-2.5" /> {s}
                </span>
              ))}
            </div>
          </div>
        )}
        {result.missing.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-700 mb-1">Missing ({result.missing.length})</p>
            <div className="flex flex-wrap gap-1">
              {result.missing.map((s) => (
                <span key={s} className="inline-flex items-center gap-0.5 rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700">
                  <XCircle className="size-2.5" /> {s}
                </span>
              ))}
            </div>
          </div>
        )}
        {result.related.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Related ({result.related.length})</p>
            <div className="flex flex-wrap gap-1">
              {result.related.map((s) => (
                <span key={s} className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                  <Minus className="size-2.5" /> {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-5", compact ? "" : "pb-8")}>
      {!compact && (
        <>
          {/* Status cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={cn("flex items-start gap-3 rounded-xl border p-4", profileComplete ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
              <CheckCircle2 className={cn("mt-0.5 size-5 shrink-0", profileComplete ? "text-emerald-600" : "text-amber-500")} />
              <div>
                <p className={cn("font-medium text-sm", profileComplete ? "text-emerald-800" : "text-amber-800")}>
                  {profileComplete ? "Profile ready" : "Profile incomplete"}
                </p>
                <p className="text-xs mt-0.5 text-slate-600">
                  {profileComplete
                    ? `${profile.skills?.length || 0} skills · ${profile.experience?.length || 0} exp. entries`
                    : "Add your CV text or experience to My Profile first."}
                </p>
              </div>
            </div>
            <div className={cn("flex items-start gap-3 rounded-xl border p-4", hasApiKey ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
              <Sparkles className={cn("mt-0.5 size-5 shrink-0", hasApiKey ? "text-emerald-600" : "text-amber-500")} />
              <div>
                <p className={cn("font-medium text-sm", hasApiKey ? "text-emerald-800" : "text-amber-800")}>
                  {hasApiKey ? "AI model configured" : "No API key"}
                </p>
                <p className="text-xs mt-0.5 text-slate-600">
                  {hasApiKey ? "LLM is ready for skill analysis." : "Add an API key in Settings to use AI features."}
                </p>
              </div>
            </div>
          </div>

          {/* Job description input */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <label className="mb-2 block font-semibold text-slate-900" htmlFor="skillJobDesc">
              Job Description
            </label>
            <p className="mb-3 text-sm text-slate-500">
              Paste a job description to analyze which skills you have, which you are missing, and what to learn next.
            </p>
            <textarea
              id="skillJobDesc"
              className="min-h-40 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="We are looking for a Data Engineer with Python, SQL, AWS, Docker, Kubernetes, and Airflow experience..."
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-400">{jobDescription.length.toLocaleString()} characters</p>
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || !jobDescription.trim() || !profileComplete || !hasApiKey}
                className="gap-2 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {analyzing ? (
                  <><Loader2 className="size-4 animate-spin" /> Analyzing…</>
                ) : (
                  <><Sparkles className="size-4" /> Analyze Skills</>
                )}
              </Button>
            </div>
          </section>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-red-800 text-sm">Analysis failed</p>
            <p className="text-sm text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !compact && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="size-5 text-emerald-500" />
                <h3 className="font-semibold text-emerald-800 text-sm">Matched Skills</h3>
              </div>
              <p className="text-2xl font-bold text-emerald-600 mb-3">{result.matched.length}</p>
              <div className="space-y-1">
                {result.matched.map((skill) => (
                  <div key={skill} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />{skill}
                  </div>
                ))}
                {result.matched.length === 0 && <p className="text-xs text-slate-400">No matching skills found.</p>}
              </div>
            </div>

            <div className="rounded-xl border border-red-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="size-5 text-red-500" />
                <h3 className="font-semibold text-red-800 text-sm">Missing Skills</h3>
              </div>
              <p className="text-2xl font-bold text-red-600 mb-3">{result.missing.length}</p>
              <div className="space-y-1">
                {result.missing.map((skill) => (
                  <div key={skill} className="flex items-center gap-2 text-sm text-slate-700">
                    <XCircle className="size-3.5 text-red-500 shrink-0" />{skill}
                  </div>
                ))}
                {result.missing.length === 0 && <p className="text-xs text-slate-400">No missing skills — great fit!</p>}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <Minus className="size-5 text-slate-500" />
                <h3 className="font-semibold text-slate-800 text-sm">Related Skills</h3>
              </div>
              <p className="text-2xl font-bold text-slate-600 mb-3">{result.related.length}</p>
              <div className="space-y-1">
                {result.related.map((skill) => (
                  <div key={skill} className="flex items-center gap-2 text-sm text-slate-700">
                    <Minus className="size-3.5 text-slate-400 shrink-0" />{skill}
                  </div>
                ))}
                {result.related.length === 0 && <p className="text-xs text-slate-400">No related skills identified.</p>}
              </div>
            </div>
          </div>

          {/* Grouped by category */}
          {result.grouping && Object.keys(result.grouping).length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Skills by Category</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(result.grouping).map(([category, skills]) => {
                  const total = skills.matched.length + skills.missing.length + skills.related.length;
                  return (
                    <div key={category} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between"
                        onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                      >
                        <h4 className="text-sm font-semibold text-slate-800">{category}</h4>
                        <span className="text-xs text-slate-400">{total} skills</span>
                      </button>
                      <div className="mt-2 space-y-1">
                        {skills.matched.map((s) => (
                          <div key={s} className="flex items-center gap-1.5 text-xs text-emerald-700">
                            <CheckCircle2 className="size-3" />{s}
                          </div>
                        ))}
                        {skills.missing.map((s) => (
                          <div key={s} className="flex items-center gap-1.5 text-xs text-red-600">
                            <XCircle className="size-3" />{s}
                          </div>
                        ))}
                        {skills.related.map((s) => (
                          <div key={s} className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Minus className="size-3" />{s}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Suggestions */}
          {result.suggestions && result.suggestions.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-white">
              <button
                type="button"
                onClick={() => setSuggestionsOpen(!suggestionsOpen)}
                className="flex w-full items-center justify-between px-5 py-3.5"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-5 text-amber-500" />
                  <h3 className="font-semibold text-slate-900">Resume Improvement Suggestions</h3>
                  <span className="text-xs text-slate-400">({result.suggestions.length})</span>
                </div>
                {suggestionsOpen
                  ? <ChevronDown className="size-4 text-slate-400" />
                  : <ChevronRight className="size-4 text-slate-400" />}
              </button>
              {suggestionsOpen && (
                <div className="border-t border-slate-200 px-5 py-4 space-y-2">
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                        {i + 1}
                      </span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
