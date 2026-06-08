"use client";

import { Sparkles } from "lucide-react";
import SkillAnalysis from "@/components/skill-analysis/SkillAnalysis";

export default function SkillAnalysisPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">ATS Skill Extraction</h2>
            <p className="text-sm text-slate-500">
              Paste a job description to compare your skills against what employers are asking for.
            </p>
          </div>
        </div>
      </div>

      <SkillAnalysis />
    </div>
  );
}