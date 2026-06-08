"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, Calendar, CheckCheck, ExternalLink, FileText,
  Inbox as InboxIcon, Mail, MailOpen, MessageSquare, Phone,
  UserPlus, X,
} from "lucide-react";

import {
  getCurrentUser,
  getJobs,
  getRecruiters,
  getEmailEvents,
  getReminders,
  getGmailConfig,
  createEmailEvent,
  createRecruiter,
  connectGmail,
  disconnectGmail,
  deleteEmailEvent,
  autoClassifyEmail,
  addJobActivity,
  updateJob,
  deleteReminder,
  createReminder,
  toggleReminder,
  Recruiter,
  EmailEvent,
  Reminder,
  JobWithCategory,
  getCategories,
  addJob,
} from "@/lib/jobpilot-store";

const typeColors: Record<string, string> = {
  APPLICATION_CONFIRMATION: "bg-blue-100 text-blue-700 border-blue-200",
  INTERVIEW: "bg-violet-100 text-violet-700 border-violet-200",
  RECRUITER_OUTREACH: "bg-amber-100 text-amber-700 border-amber-200",
  ASSESSMENT: "bg-purple-100 text-purple-700 border-purple-200",
  OFFER: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTION: "bg-red-100 text-red-700 border-red-200",
  OTHER: "bg-slate-100 text-slate-600 border-slate-200",
};

const typeLabels: Record<string, string> = {
  APPLICATION_CONFIRMATION: "Application Confirmation",
  INTERVIEW: "Interview Invitation",
  RECRUITER_OUTREACH: "Recruiter Outreach",
  ASSESSMENT: "Assessment Request",
  OFFER: "Offer",
  REJECTION: "Rejection",
  OTHER: "Other",
};

const statusFromType: Record<string, string> = {
  APPLICATION_CONFIRMATION: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTION: "Rejected",
};

export default function InboxPage() {
  const router = useRouter();
  const [user, setUser] = useState(getCurrentUser());
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [gmailConfig, setGmailConfig] = useState(getGmailConfig());
  const [activeTab, setActiveTab] = useState("inbox");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    refresh();
  }, [user]);

  function refresh() {
    if (!user) return;
    setEvents(getEmailEvents(user.id));
    setRecruiters(getRecruiters(user.id));
    setReminders(getReminders(user.id));
    setGmailConfig(getGmailConfig());
  }

  // ── Categorization ──
  const inboxEvents = useMemo(() => events.filter((e) => !e.matchedJobId).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)), [events]);
  const matchedEvents = useMemo(() => events.filter((e) => e.matchedJobId).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)), [events]);

  const interviewInvites = useMemo(() => inboxEvents.filter((e) => e.type === "INTERVIEW"), [inboxEvents]);
  const offers = useMemo(() => inboxEvents.filter((e) => e.type === "OFFER"), [inboxEvents]);
  const rejections = useMemo(() => inboxEvents.filter((e) => e.type === "REJECTION"), [inboxEvents]);
  const recruiterMessages = useMemo(() => inboxEvents.filter((e) => e.type === "RECRUITER_OUTREACH"), [inboxEvents]);
  const others = useMemo(() => inboxEvents.filter((e) => !["INTERVIEW", "OFFER", "REJECTION", "RECRUITER_OUTREACH"].includes(e.type)), [inboxEvents]);

  // ── Reminders ──
  const today = new Date().toISOString().slice(0, 10);
  const upcomingReminders = useMemo(() => {
    const pending = reminders.filter((r) => !r.completed);
    return {
      overdue: pending.filter((r) => r.dueDate < today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
      today: pending.filter((r) => r.dueDate === today),
      thisWeek: pending.filter((r) => {
        const d = new Date(r.dueDate);
        const end = new Date();
        end.setDate(end.getDate() + (7 - end.getDay()));
        return r.dueDate > today && d <= end;
      }).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    };
  }, [reminders, today]);

  // ── Import Email ──
  function handleImport() {
    if (!user || !importText.trim()) return;
    const classified = autoClassifyEmail(importText);
    // Check for recruiter extraction
    const companyMatch = importText.match(/(?:at|from|with)\s+([A-Z][A-Za-z0-9.\s&]+?)(?:\s|,|\.|$)/);
    const company = companyMatch?.[1]?.trim() || classified.company || "Unknown";
    const nameMatch = importText.match(/(?:from|by|regards|best|sincerely),?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
    const recruiterName = nameMatch?.[1]?.trim();
    const emailMatch = importText.match(/[\w.-]+@[\w.-]+\.\w+/);
    const recruiterEmail = emailMatch?.[0];
    const subjectMatch = importText.match(/^Subject:\s*(.+)$/m);
    const subject = subjectMatch?.[1]?.trim() || "Imported Email";

    // Auto-create recruiter if detected
    let recruiterId: string | undefined;
    if (recruiterName || recruiterEmail) {
      const existing = recruiters.find(
        (r) => r.email === recruiterEmail || (recruiterName && r.name.toLowerCase() === recruiterName.toLowerCase())
      );
      if (existing) {
        recruiterId = existing.id;
      } else {
        const newRecruiter = createRecruiter(user.id, {
          name: recruiterName || recruiterEmail || "Unknown",
          company: company,
          email: recruiterEmail,
        });
        recruiterId = newRecruiter.id;
        refresh();
      }
    }

    // Create event
    const event = createEmailEvent(user.id, {
      type: classified.type,
      subject,
      sender: recruiterEmail || "imported@email.com",
      body: importText,
      company,
      recruiterId,
    });

    // Auto-match to existing jobs
    const jobs = getJobs(user.id);
    const matched = jobs.find((j) =>
      j.company?.toLowerCase().includes(company.toLowerCase()) ||
      company.toLowerCase().includes(j.company?.toLowerCase() || "")
    );
    if (matched) {
      // Auto-update status
      const newStatus = statusFromType[classified.type];
      if (newStatus) {
        updateJob(user.id, matched.id, { status: newStatus as any });
        addJobActivity(user.id, matched.id, {
          type: "email",
          description: `${typeLabels[classified.type] || classified.type} detected: ${subject}`,
        });
      }
      // Link event to job
      event.matchedJobId = matched.id;
    }

    setImportText("");
    setShowImport(false);
    refresh();
  }

  // ── Connect Gmail emulation ──
  function handleConnectGmail() {
    if (!user) return;
    connectGmail(user.email);
    refresh();
  }

  function handleDisconnect() {
    disconnectGmail();
    refresh();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100">
            <Mail className="size-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Job Search Inbox</h2>
            <p className="text-sm text-slate-500">
              {gmailConfig.connected ? `Connected as ${gmailConfig.email}` : "Not connected to Gmail"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {gmailConfig.connected ? (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              onClick={handleDisconnect}
            >
              <X className="size-4" /> Disconnect
            </button>
          ) : (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
              onClick={handleConnectGmail}
            >
              <Mail className="size-4" /> Connect Gmail
            </button>
          )}
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            onClick={() => setShowImport(true)}
          >
            <FileText className="size-4" /> Import Email
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold">Paste Email Content</h3>
          <textarea
            className="w-full rounded-lg border border-slate-200 p-3 text-sm min-h-[200px]"
            placeholder="Paste the full email content here. JobPilot will automatically classify it..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50" onClick={() => setShowImport(false)}>Cancel</button>
            <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700" onClick={handleImport} disabled={!importText.trim()}>Classify & Import</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {[
          { id: "inbox", label: "Inbox", icon: InboxIcon },
          { id: "reminders", label: "Reminders", icon: Bell },
          { id: "recruiters", label: "Recruiters", icon: UserPlus },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="size-4" />
            {tab.label}
            {tab.id === "inbox" && inboxEvents.length > 0 && (
              <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">{inboxEvents.length}</span>
            )}
            {tab.id === "reminders" && upcomingReminders.overdue.length + upcomingReminders.today.length > 0 && (
              <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">{upcomingReminders.overdue.length + upcomingReminders.today.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── INBOX TAB ─────────────────────────────────────── */}
      {activeTab === "inbox" && (
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
              <p className="text-xs text-violet-600 font-medium">Interview Invites</p>
              <p className="text-xl font-bold text-violet-700">{interviewInvites.length}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-600 font-medium">Offers</p>
              <p className="text-xl font-bold text-emerald-700">{offers.length}</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs text-red-600 font-medium">Rejections</p>
              <p className="text-xl font-bold text-red-700">{rejections.length}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-600 font-medium">Recruiter Messages</p>
              <p className="text-xl font-bold text-amber-700">{recruiterMessages.length}</p>
            </div>
          </div>

          {/* Unmatched Emails */}
          {inboxEvents.length > 0 ? (
            <div className="space-y-2">
              {inboxEvents.map((event) => {
                const r = event.recruiterId ? recruiters.find((rec) => rec.id === event.recruiterId) : null;
                return (
                  <div key={event.id} className="rounded-lg border border-slate-200 bg-white p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold border ${typeColors[event.type] || typeColors.OTHER}`}>
                            {typeLabels[event.type] || event.type}
                          </span>
                          {event.company && (
                            <span className="text-xs text-slate-500">{event.company}</span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-900 truncate">{event.subject}</p>
                        <p className="text-xs text-slate-400">
                          {event.sender} · {new Date(event.receivedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button className="rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-50"
                          onClick={() => {
                            const jobs = getJobs(user!.id);
                            if (jobs.length > 0) {
                              const match = jobs.find((j) =>
                                j.company?.toLowerCase().includes((event.company || "").toLowerCase())
                              );
                              if (match) {
                                const ns = statusFromType[event.type];
                                if (ns) updateJob(user!.id, match.id, { status: ns as any });
                                addJobActivity(user!.id, match.id, { type: "email", description: `${typeLabels[event.type]} matched: ${event.subject}` });
                                event.matchedJobId = match.id;
                                refresh();
                              }
                            }
                          }}
                        >
                          Link
                        </button>
                        <button className="rounded-md border border-red-200 px-2 py-1 text-[10px] text-red-500 hover:bg-red-50"
                          onClick={() => { deleteEmailEvent(event.id); refresh(); }}
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    </div>
                    {event.body && (
                      <p className="mt-2 text-xs text-slate-500 line-clamp-2">{event.body.slice(0, 200)}</p>
                    )}
                    {r && (
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-blue-600">
                        <UserPlus className="size-3" />
                        Recruiter: {r.name} ({r.email})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
              <MailOpen className="size-10" />
              <p className="text-sm">No emails yet. Import an email to get started.</p>
            </div>
          )}

          {/* Matched Events */}
          {matchedEvents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Matched to Jobs</h3>
              <div className="space-y-2">
                {matchedEvents.map((event) => (
                  <div key={event.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-2">
                      <CheckCheck className="size-4 text-emerald-500" />
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold border ${typeColors[event.type] || typeColors.OTHER}`}>
                        {typeLabels[event.type] || event.type}
                      </span>
                      <span className="text-xs text-slate-500">{event.company} · {event.subject}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{new Date(event.receivedAt).toLocaleDateString()} → Auto-updated status</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REMINDERS TAB ──────────────────────────────────── */}
      {activeTab === "reminders" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Follow-Up Reminders</h3>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
              onClick={() => {
                const title = prompt("Reminder title:");
                if (!title || !user) return;
                const date = prompt("Due date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
                if (!date) return;
                createReminder(user.id, { title, dueDate: date });
                refresh();
              }}
            >
              <Bell className="size-3" /> New Reminder
            </button>
          </div>

          {/* Overdue */}
          {upcomingReminders.overdue.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Overdue</h4>
              <div className="space-y-1">
                {upcomingReminders.overdue.map((r) => (
                  <ReminderRow key={r.id} reminder={r} user={user!} onToggle={() => { toggleReminder(r.id); refresh(); }} onDelete={() => { deleteReminder(r.id); refresh(); }} />
                ))}
              </div>
            </div>
          )}

          {/* Today */}
          {upcomingReminders.today.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Today</h4>
              <div className="space-y-1">
                {upcomingReminders.today.map((r) => (
                  <ReminderRow key={r.id} reminder={r} user={user!} onToggle={() => { toggleReminder(r.id); refresh(); }} onDelete={() => { deleteReminder(r.id); refresh(); }} />
                ))}
              </div>
            </div>
          )}

          {/* This Week */}
          {upcomingReminders.thisWeek.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">This Week</h4>
              <div className="space-y-1">
                {upcomingReminders.thisWeek.map((r) => (
                  <ReminderRow key={r.id} reminder={r} user={user!} onToggle={() => { toggleReminder(r.id); refresh(); }} onDelete={() => { deleteReminder(r.id); refresh(); }} />
                ))}
              </div>
            </div>
          )}

          {upcomingReminders.overdue.length + upcomingReminders.today.length + upcomingReminders.thisWeek.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
              <Bell className="size-10" />
              <p className="text-sm">No reminders. Create one to follow up with a recruiter.</p>
            </div>
          )}
        </div>
      )}

      {/* ── RECRUITERS TAB ─────────────────────────────────── */}
      {activeTab === "recruiters" && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Recruiter CRM</h3>
          {recruiters.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recruiters.map((r) => {
                const recruiterEvents = events.filter((e) => e.recruiterId === r.id);
                const lastContact = recruiterEvents.length > 0
                  ? recruiterEvents.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0].receivedAt
                  : null;
                const recruiterReminders = reminders.filter((rem) => rem.recruiterId === r.id);
                return (
                  <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                        {r.name.split(/\s/).map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{r.name}</p>
                        <p className="text-xs text-slate-500">{r.company || "Unknown"}</p>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      {r.email && <p className="flex items-center gap-1"><Mail className="size-3" /> {r.email}</p>}
                      {r.linkedinUrl && <p className="flex items-center gap-1"><ExternalLink className="size-3" /> {r.linkedinUrl}</p>}
                      {r.phone && <p className="flex items-center gap-1"><Phone className="size-3" /> {r.phone}</p>}
                      <p className="flex items-center gap-1"><MessageSquare className="size-3" /> {recruiterEvents.length} communications</p>
                      {lastContact && (
                        <p className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          Last contact: {new Date(lastContact).toLocaleDateString()}
                        </p>
                      )}
                      {recruiterReminders.filter((rem) => !rem.completed).length > 0 && (
                        <p className="flex items-center gap-1 text-amber-600">
                          <Bell className="size-3" /> Follow-up pending
                        </p>
                      )}
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      <button
                        className="rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-50"
                        onClick={() => {
                          const title = prompt("Reminder title:", `Follow up with ${r.name}`);
                          if (!title) return;
                          const date = prompt("Due date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
                          if (!date) return;
                          createReminder(user!.id, { title, dueDate: date, recruiterId: r.id });
                          refresh();
                        }}
                      >
                        <Bell className="size-3 inline mr-1" /> Set Reminder
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
              <UserPlus className="size-10" />
              <p className="text-sm">No recruiters yet. They are created automatically when you import emails.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReminderRow({ reminder, user, onToggle, onDelete }: {
  reminder: Reminder; user: import("@/lib/jobpilot-store").User;
  onToggle: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-3">
        <button
          className={`flex size-5 items-center justify-center rounded border ${
            reminder.completed ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
          }`}
          onClick={onToggle}
        >
          {reminder.completed && <CheckCheck className="size-3 text-white" />}
        </button>
        <div>
          <p className={`text-sm ${reminder.completed ? "line-through text-slate-400" : "text-slate-900"}`}>
            {reminder.title}
          </p>
          <p className="text-xs text-slate-400">{new Date(reminder.dueDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
        </div>
      </div>
      <button className="text-slate-400 hover:text-red-500" onClick={onDelete}>
        <X className="size-4" />
      </button>
    </div>
  );
}