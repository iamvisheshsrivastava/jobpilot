"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Star, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  JobWithCategory,
  JobStatus,
  JOB_STATUSES,
  JobPriority,
  JOB_PRIORITIES,
  updateJob,
  getCurrentUser,
  isDemoAccount,
} from "@/lib/jobpilot-store";

interface JobDetailDrawerProps {
  job: JobWithCategory | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function JobDetailDrawer({ job, open, onClose, onSaved }: JobDetailDrawerProps) {
  const [user, setUser] = useState(getCurrentUser());
  const demo = isDemoAccount(user);

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

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

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
      setSaved(false);
    }
  }, [job]);

  function handleSave() {
    if (!user || !job || demo) return;
    updateJob(user.id, job.id, {
      title,
      company: company || undefined,
      link: link || undefined,
      status,
      priority,
      deadline: deadline || undefined,
      comments: comments || undefined,
      notes: notes || undefined,
      recruiterName: recruiterName || undefined,
      recruiterEmail: recruiterEmail || undefined,
      recruiterLinkedIn: recruiterLinkedIn || undefined,
      resumeUsed: resumeUsed || undefined,
      applicationNotes: applicationNotes || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved();
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

          {/* Resume Used */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Resume Used</h3>
            <div className="space-y-1">
              <Input value={resumeUsed} onChange={(e) => setResumeUsed(e.target.value)} placeholder="e.g. Data Scientist CV v3" disabled={demo} />
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