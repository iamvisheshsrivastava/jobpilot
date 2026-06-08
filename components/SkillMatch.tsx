"use client"

import { useState } from "react"
import { Loader2, Check, X, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface SkillMatchResult {
  matched: string[]
  missing: string[]
  niceToHave: string[]
  matchedNice: string[]
}

interface SkillMatchProps {
  jobDescription: string
}

export default function SkillMatch({ jobDescription }: SkillMatchProps) {
  const [result, setResult] = useState<SkillMatchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [expanded, setExpanded] = useState(false)

  async function handleAnalyze() {
    if (!jobDescription?.trim()) return
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const res = await fetch("/api/skill-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to analyze skills")
        return
      }
      setResult(data)
      setExpanded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    } finally {
      setLoading(false)
    }
  }

  const totalRequired = (result?.matched.length ?? 0) + (result?.missing.length ?? 0)

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-slate-700">Skill Match</span>
        <div className="flex items-center gap-2">
          {result && (
            <span className="text-xs text-slate-500">
              {result.matched.length}/{totalRequired} required
            </span>
          )}
          {expanded ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
          {/* Analyze button or results */}
          {!result && !error && (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || !jobDescription?.trim()}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                "bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Analyzing skills...
                </span>
              ) : (
                "Analyze Skills"
              )}
            </button>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
              <button
                type="button"
                onClick={handleAnalyze}
                className="ml-2 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {result && (
            <>
              {/* Required Skills */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Required Skills
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {result.matched.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
                    >
                      <Check className="size-3" />
                      {skill}
                    </span>
                  ))}
                  {result.missing.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700"
                    >
                      <X className="size-3" />
                      {skill}
                    </span>
                  ))}
                  {totalRequired === 0 && (
                    <span className="text-xs text-slate-400">No skills detected</span>
                  )}
                </div>
              </div>

              {/* Nice to Have */}
              {result.niceToHave.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Nice to Have
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.matchedNice.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
                      >
                        <Check className="size-3" />
                        {skill}
                      </span>
                    ))}
                    {result.niceToHave
                      .filter((s) => !result.matchedNice.includes(s))
                      .map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500"
                        >
                          {skill}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Summary line */}
              {totalRequired > 0 && (
                <p className="text-xs text-slate-500">
                  You match {result.matched.length} of {totalRequired} required skill
                  {totalRequired === 1 ? "" : "s"}
                  {result.missing.length > 0 && (
                    <>
                      . Missing: <span className="font-medium text-slate-700">{result.missing.join(", ")}</span>
                    </>
                  )}
                  .
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}