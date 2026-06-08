"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  Sparkles,
  User2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  fetchApiKeys,
  fetchProfile,
  UserProfile,
} from "@/lib/api";
import { callLLM } from "@/lib/llm";
import { cn } from "@/lib/utils";

function buildSystemPrompt(): string {
  return `You are an expert CV writer and ATS optimization specialist. Your task is to rewrite a candidate's CV to be perfectly tailored for a specific job description.

Guidelines:
- Mirror keywords and phrases from the job description naturally
- Quantify achievements where possible
- Use strong action verbs (Led, Built, Improved, Reduced, Increased, etc.)
- Ensure the CV passes ATS systems by matching required skills exactly
- Keep it professional, concise, and achievement-focused
- Use standard section headings: PROFESSIONAL SUMMARY, WORK EXPERIENCE, SKILLS, EDUCATION, LANGUAGES, CERTIFICATIONS
- Format dates consistently (Month YYYY or YYYY-MM)
- Output plain text with clear section separators (===)

Output the full optimized CV in plain text format.`;
}

function buildUserPrompt(profile: UserProfile, userEmail: string, jobDescription: string): string {
  const sections: string[] = [];

  sections.push(`=== CANDIDATE PROFILE ===`);
  sections.push(`Email: ${userEmail}`);

  if (profile.summary) {
    sections.push(`\n=== PROFESSIONAL SUMMARY ===\n${profile.summary}`);
  }

  if (profile.skills?.length) {
    sections.push(`\n=== SKILLS ===\n${profile.skills.join(", ")}`);
  }

  if (profile.experience?.length) {
    sections.push(`\n=== WORK EXPERIENCE ===`);
    for (const exp of profile.experience) {
      sections.push(`\n${exp.title} @ ${exp.company}${exp.location ? ` (${exp.location})` : ""}`);
      sections.push(`${exp.startDate} – ${exp.endDate || "Present"}`);
      if (exp.description) sections.push(exp.description);
    }
  }

  if (profile.education?.length) {
    sections.push(`\n=== EDUCATION ===`);
    for (const edu of profile.education) {
      sections.push(`\n${edu.degree}${edu.field ? ` in ${edu.field}` : ""} — ${edu.institution}`);
      if (edu.startDate || edu.endDate) sections.push(`${edu.startDate || ""} – ${edu.endDate || "Present"}`);
    }
  }

  if (profile.languages?.length) {
    sections.push(`\n=== LANGUAGES ===\n${profile.languages.map((l) => `${l.language}: ${l.level}`).join(" | ")}`);
  }

  if (profile.certifications?.length) {
    sections.push(`\n=== CERTIFICATIONS ===\n${profile.certifications.join("\n")}`);
  }

  if (profile.cvText) {
    sections.push(`\n=== FULL CV TEXT (for additional context) ===\n${profile.cvText.slice(0, 3000)}`);
  }

  sections.push(`\n\n=== JOB DESCRIPTION ===\n${jobDescription}`);
  sections.push(`\n\nPlease rewrite the CV above to be perfectly optimized for this specific job description. Tailor every section to match the role requirements while keeping all factual information accurate.`);

  return sections.join("\n");
}

async function downloadPDF(cvText: string, name: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 14;
  let y = margin;

  const lines = cvText.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    const isSection = trimmed.startsWith("===") && trimmed.endsWith("===");

    if (isSection) {
      if (y > margin + 20) y += 6;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const label = trimmed.replace(/===/g, "").trim();
      doc.text(label, margin, y);
      y += lineHeight + 2;
      doc.setDrawColor(200, 210, 230);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    } else if (trimmed === "") {
      y += lineHeight * 0.5;
    } else {
      doc.setFontSize(10);
      const wrapped = doc.splitTextToSize(line, maxWidth);
      for (const wLine of wrapped) {
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(wLine, margin, y);
        y += lineHeight;
      }
    }
  }

  doc.save(`${name.replace(/\s+/g, "_")}_CV_ATS.pdf`);
}

async function downloadDOCX(cvText: string, name: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [];

  for (const line of cvText.split("\n")) {
    const trimmed = line.trim();
    const isSection = trimmed.startsWith("===") && trimmed.endsWith("===");
    if (isSection) {
      const label = trimmed.replace(/===/g, "").trim();
      children.push(
        new Paragraph({
          text: label,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }),
      );
    } else if (trimmed === "") {
      children.push(new Paragraph({ text: "" }));
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
          spacing: { after: 60 },
        }),
      );
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/\s+/g, "_")}_CV_ATS.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GenerateCVPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);

  useEffect(() => {
    Promise.all([fetchProfile(), fetchApiKeys()])
      .then(([p, keys]) => {
        setProfile(p);
        setHasApiKey(keys.length > 0);
      })
      .catch(() => {});
  }, []);

  const profileComplete = profile && (profile.cvText || (profile.experience?.length ?? 0) > 0 || (profile.skills?.length ?? 0) > 0);

  async function handleGenerate() {
    if (!profile || !jobDescription.trim()) return;
    setError("");
    setResult("");
    setGenerating(true);

    const res = await callLLM(
      session?.user?.id ?? "",
      buildSystemPrompt(),
      buildUserPrompt(profile, session?.user?.email ?? "", jobDescription),
    );

    setGenerating(false);
    if (res.ok) {
      setResult(res.text);
    } else {
      setError(res.error);
    }
  }

  async function handleDownloadPDF() {
    if (!result) return;
    setDownloading("pdf");
    try {
      await downloadPDF(result, session?.user?.email ?? "CV");
    } catch (e) {
      setError("PDF generation failed: " + (e instanceof Error ? e.message : String(e)));
    }
    setDownloading(null);
  }

  async function handleDownloadDOCX() {
    if (!result) return;
    setDownloading("docx");
    try {
      await downloadDOCX(result, session?.user?.email ?? "CV");
    } catch (e) {
      setError("DOCX generation failed: " + (e instanceof Error ? e.message : String(e)));
    }
    setDownloading(null);
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="size-5 text-blue-500" /> Generate ATS-Optimized CV
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Paste a job description and we&apos;ll rewrite your CV to match it — tailored keywords, ATS-friendly format, ready to apply.
        </p>
      </div>

      {/* Status cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Profile status */}
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4",
            profileComplete ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50",
          )}
        >
          <User2 className={cn("mt-0.5 size-5 shrink-0", profileComplete ? "text-emerald-600" : "text-amber-500")} />
          <div>
            <p className={cn("font-medium text-sm", profileComplete ? "text-emerald-800" : "text-amber-800")}>
              {profileComplete ? "Profile ready" : "Profile incomplete"}
            </p>
            <p className="text-xs mt-0.5 text-slate-600">
              {profileComplete
                ? `${profile.skills?.length || 0} skills · ${profile.experience?.length || 0} exp. entries`
                : "Add your CV text or experience to My Profile first."}
            </p>
            {!profileComplete && (
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="mt-1.5 text-xs font-medium text-amber-700 underline underline-offset-2"
              >
                Go to My Profile →
              </button>
            )}
          </div>
        </div>

        {/* API key status */}
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4",
            hasApiKey ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50",
          )}
        >
          <Sparkles className={cn("mt-0.5 size-5 shrink-0", hasApiKey ? "text-emerald-600" : "text-amber-500")} />
          <div>
            <p className={cn("font-medium text-sm", hasApiKey ? "text-emerald-800" : "text-amber-800")}>
              {hasApiKey ? "AI model configured" : "No API key"}
            </p>
            <p className="text-xs mt-0.5 text-slate-600">
              {hasApiKey
                ? "Your LLM is ready for CV generation."
                : "Add an API key in Settings to use AI features."}
            </p>
            {!hasApiKey && (
              <button
                type="button"
                onClick={() => router.push("/settings")}
                className="mt-1.5 text-xs font-medium text-amber-700 underline underline-offset-2"
              >
                Go to Settings →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Job description input */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <label className="mb-2 block font-semibold text-slate-900" htmlFor="jobDesc">
          Job Description
        </label>
        <p className="mb-3 text-sm text-slate-500">
          Paste the full job description — requirements, responsibilities, and company info. More detail = better CV.
        </p>
        <textarea
          id="jobDesc"
          className="min-h-52 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="We are looking for a Senior Full Stack Developer to join our team in Berlin...&#10;&#10;Requirements:&#10;• 5+ years of React/TypeScript experience&#10;• ..."
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-400">{jobDescription.length.toLocaleString()} characters</p>
          <Button
            onClick={handleGenerate}
            disabled={generating || !jobDescription.trim() || !profileComplete || !hasApiKey}
            className="gap-2 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {generating ? (
              <><Loader2 className="size-4 animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="size-4" /> Generate ATS-Optimized CV</>
            )}
          </Button>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-red-800 text-sm">Generation failed</p>
            <p className="text-sm text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <section className="rounded-xl border border-emerald-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-emerald-600" />
              <h2 className="font-semibold text-slate-900">Your Optimized CV</h2>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={downloading === "pdf"}
                className="gap-1.5"
              >
                {downloading === "pdf" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                Download PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadDOCX}
                disabled={downloading === "docx"}
                className="gap-1.5"
              >
                {downloading === "docx" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                Download Word
              </Button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap px-5 py-4 text-sm text-slate-800 font-sans leading-relaxed max-h-[60vh] overflow-y-auto">
            {result}
          </pre>
        </section>
      )}
    </div>
  );
}
