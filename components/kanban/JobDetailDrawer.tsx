"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { X, ExternalLink, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SkillMatch from "@/components/SkillMatch";
import {
  JobWithCategory,
  JobStatus,
  JOB_STATUSES,
  JobPriority,
  JOB_PRIORITIES,
  DEMO_ACCOUNT_EMAIL,
} from "@/lib/jobpilot-store";

interface JobDetailDrawerProps {
  job: JobWithCategory | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function JobDetailDrawer({ job, open, onClose, onSaved }: JobDetailDrawerProps) {
  const { data: session } = useSession();
  const demo = session?.user?.email === DEMO_ACCOUNT_EMAIL;

  // Resume versions state
  const [resumeVersions, setResumeVersions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedResumeVersionId, setSelectedResumeVersionId] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<JobStatus>("In Progress");
  const [priority, setPriority] = useState<JobPriority>("Medium");
  const [deadline, setDeadline] = useState("");
  const [comments, setComments] = useState("");
  const [notes, setNotes] = useState("");
  const [recruiterName, setRecruiterName] = useState("");
  const [recruiterEmail, setRecruiterEmail] = useState("");
  const [recruiterLinkedIn, setRecruiterLinkedIn] = useState("");
  const [resumeUsed, setResumeUsed] = useState("");
  const [applicationNotes, setApplicationNotes] = useState("");
  const [saved, setSaved] = useState(false);

  // Interview scheduling (#20)
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewType, setInterviewType] = useState("");
  const [interviewLocation, setInterviewLocation] = useState("");

  // AI match score (#21)
  const [matchChecking, setMatchChecking] = useState(false);
  const [matchError, setMatchError] = useState("");

  // Fetch resume versions from API
  const fetchResumeVersions = useCallback(async () => {
    try {
      const res = await fetch("/api/resume-versions");
      if (res.ok) {
        const data = await res.json();
        setResumeVersions(data);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchResumeVersions();
    }
  }, [open, fetchResumeVersions]);

  useEffect(() => {
    if (job) {
      setTitle(job.title || "");
      setCompany(job.company || "");
      setLink(job.link || "");
      setStatus(job.status);
      setPriority(job.priority);
      setDeadline(job.deadline || "");
      setComments(job.comments || "");
      setNotes(job.notes || "");
      setRecruiterName(job.recruiterName || "");
      setRecruiterEmail(job.recruiterEmail || "");
      setRecruiterLinkedIn(job.recruiterLinkedIn || "");
      setResumeUsed(job.resumeUsed || "");
      setApplicationNotes(job.applicationNotes || "");
      setSelectedResumeVersionId(job.resumeVersionId || "");
      setInterviewDate(job.interviewDate ? job.interviewDate.slice(0, 16) : "");
      setInterviewType(job.interviewType || "");
      setInterviewLocation(job.interviewLocation || "");
      setMatchError("");
      setSaved(false);
    }
  }, [job]);

  async function handleSave() {
    if (!job || demo) return;
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          company: company || null,
          link: link || null,
          status,
          priority,
          deadline: deadline || null,
          comments: comments || null,
          notes: notes || null,
          recruiterName: recruiterName || null,
          recruiterEmail: recruiterEmail || null,
          recruiterLinkedIn: recruiterLinkedIn || null,
          resumeVersion: resumeUsed || null,
          applicationNotes: applicationNotes || null,
          resumeVersionId: selectedResumeVersionId || null,
          interviewDate: interviewDate || null,
          interviewType: interviewType || null,
          interviewLocation: interviewLocation || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        console.error('[JobDetailDrawer] save error:', err);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (err) {
      console.error('[JobDetailDrawer] save error:', err);
    }
  }

  async function handleCheckMatch() {
    if (!job || demo) return;
    setMatchChecking(true);
    setMatchError("");
    try {
      const pageText = [job.title, job.company, comments, applicationNotes].filter(Boolean).join("\n\n");
      if (!pageText.trim()) {
        setMatchError("Add a job description to Comments or Application Notes first.");
        return;
      }
      const profileRes = await fetch("/api/profile");
      const profile = profileRes.ok ? await profileRes.json() : null;
      let skillsList = "";
      try { skillsList = profile?.skills ? JSON.parse(profile.skills).join(", ") : ""; } catch { /* ignore */ }
      const userProfile = profile
        ? [profile.summary, skillsList, profile.cvText].filter(Boolean).join("\n")
        : "";

      const res = await fetch("/api/suitability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageText, userProfile, jobId: job.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMatchError(data.error ?? "Failed to check match."); return; }
      onSaved();
    } catch {
      setMatchError("Network error. Please try again.");
    } finally {
      setMatchChecking(false);
    }
  }

  if (!open || !job) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-xl border-l border-slate-200",
          "flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold text-slate-900 truncate pr-2">
            {job.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Basic info */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Job Details</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={demo} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Company</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} disabled={demo} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Link</Label>
                <div className="flex gap-2">
                  <Input value={link} onChange={(e) => setLink(e.target.value)} disabled={demo} className="flex-1" />
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 shrink-0"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Status</Label>
                  <select
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as JobStatus)}
                    disabled={demo}
                  >
                    {JOB_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Priority</Label>
                  <select
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as JobPriority)}
                    disabled={demo}
                  >
                    {JOB_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Deadline</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={demo} />
              </div>
            </div>
          </section>

          {/* Recruiter Info */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recruiter</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Name</Label>
                <Input value={recruiterName} onChange={(e) => setRecruiterName(e.target.value)} placeholder="Recruiter name" disabled={demo} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Email</Label>
                <Input type="email" value={recruiterEmail} onChange={(e) => setRecruiterEmail(e.target.value)} placeholder="recruiter@company.com" disabled={demo} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">LinkedIn URL</Label>
                <Input value={recruiterLinkedIn} onChange={(e) => setRecruiterLinkedIn(e.target.value)} placeholder="linkedin.com/in/recruiter" disabled={demo} />
              </div>
            </div>
          </section>

          {/* Resume Version (linked to ResumeVersion model) */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Resume Used</h3>
            <div className="space-y-2">
              <select
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                value={selectedResumeVersionId}
                onChange={(e) => {
                  setSelectedResumeVersionId(e.target.value)
                  const selected = resumeVersions.find((v) => v.id === e.target.value)
                  if (selected) setResumeUsed(selected.name)
                  if (!e.target.value) setResumeUsed("")
                }}
                disabled={demo}
              >
                <option value="">None (type below instead)</option>
                {resumeVersions.map((rv) => (
                  <option key={rv.id} value={rv.id}>{rv.name}</option>
                ))}
              </select>
              <Input value={resumeUsed} onChange={(e) => setResumeUsed(e.target.value)} placeholder="Or type a custom name" disabled={demo} />
            </div>
          </section>

          {/* Comments */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Comments</h3>
            <textarea
              className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="General comments about this job..."
              disabled={demo}
            />
          </section>

          {/* Application Notes */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Application Notes</h3>
            <textarea
              className="min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              value={applicationNotes}
              onChange={(e) => setApplicationNotes(e.target.value)}
              placeholder="Interview notes, follow-up reminders, things to prepare..."
              disabled={demo}
            />
          </section>

          {/* Notes (legacy) */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Notes (Legacy)</h3>
            <textarea
              className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Legacy notes field..."
              disabled={demo}
            />
          </section>

          {/* Interview Scheduling */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Interview Scheduling</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Date &amp; Time</Label>
                <Input
                  type="datetime-local"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  disabled={demo}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Type</Label>
                  <select
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                    disabled={demo}
                  >
                    <option value="">—</option>
                    <option value="Phone">Phone</option>
                    <option value="Video">Video</option>
                    <option value="Onsite">Onsite</option>
                    <option value="Technical">Technical</option>
                    <option value="Final">Final</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Location / Link</Label>
                  <Input
                    value={interviewLocation}
                    onChange={(e) => setInterviewLocation(e.target.value)}
                    placeholder="Zoom link, address..."
                    disabled={demo}
                  />
                </div>
              </div>
              {interviewDate && (
                <p className="text-xs text-slate-500">
                  Reminder: add this to your calendar — JobPilot doesn&apos;t send separate interview alerts yet.
                </p>
              )}
            </div>
          </section>

          {/* AI Match Score */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">AI Match Score</h3>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              {job.matchScore != null ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-semibold text-slate-900">{job.matchScore}<span className="text-sm text-slate-400">/100</span></p>
                    {job.matchVerdict && <p className="text-xs text-slate-500 mt-0.5">{job.matchVerdict}</p>}
                  </div>
                  <Button type="button" variant="outline" size="sm" disabled={matchChecking || demo} onClick={handleCheckMatch}>
                    {matchChecking ? "Checking…" : "Re-check"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">Not checked yet.</p>
                  <Button type="button" size="sm" disabled={matchChecking || demo} onClick={handleCheckMatch}>
                    {matchChecking ? "Checking…" : "Check AI Match"}
                  </Button>
                </div>
              )}
              {matchError && <p className="mt-2 text-xs text-red-600">{matchError}</p>}
            </div>
          </section>

          {/* Skill Match */}
          <section>
            <SkillMatch jobDescription={applicationNotes || comments || ""} />
          </section>
        </div>

        {/* Footer with save */}
        <div className="shrink-0 border-t border-slate-200 px-5 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            #{job.jobNumber} · {job.categoryName}
          </p>
          {!demo && (
            <Button onClick={handleSave} className="gap-2 bg-blue-500 text-white hover:bg-blue-600">
              <Save className="size-4" />
              {saved ? "Saved ✓" : "Save Changes"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
