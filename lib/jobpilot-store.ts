"use client";

// ── Constants ────────────────────────────────────────────────────────────────

export const JOB_STATUSES = [
  "In Progress",
  "Applied",
  "Interview",
  "Offer",
  "Look Again",
  "Rejected",
  "Not Suitable",
  "Expired/Filled",
] as const;

export const JOB_PRIORITIES = ["Super High", "High", "Medium", "Low"] as const;

export const LLM_PROVIDERS = ["OpenAI", "Anthropic", "Gemini", "Groq", "OpenRouter"] as const;

export const PROVIDER_MODELS: Record<LlmProvider, string[]> = {
  OpenAI: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  Anthropic: [
    "claude-opus-4-5",
    "claude-sonnet-4-5",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-haiku-20240307",
  ],
  Gemini: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-8b"],
  Groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
  ],
  OpenRouter: [
    "mistralai/mistral-7b-instruct",
    "meta-llama/llama-3.1-8b-instruct:free",
    "google/gemma-2-9b-it:free",
    "custom",
  ],
};

export const DEMO_ACCOUNT_EMAIL = "demo@jobpilot.app";

export const KANBAN_COLUMNS = ["Saved", "Applied", "Interview", "Offer", "Rejected"] as const;
export type KanbanColumn = (typeof KANBAN_COLUMNS)[number];

export const STATUS_TO_KANBAN: Record<JobStatus, KanbanColumn> = {
  "In Progress": "Saved", "Look Again": "Saved", "Applied": "Applied",
  "Interview": "Interview", "Offer": "Offer",
  "Rejected": "Rejected", "Not Suitable": "Rejected", "Expired/Filled": "Rejected",
};

export const KANBAN_TO_STATUSES: Record<KanbanColumn, JobStatus[]> = {
  Saved: ["In Progress", "Look Again"], Applied: ["Applied"],
  Interview: ["Interview"], Offer: ["Offer"],
  Rejected: ["Rejected", "Not Suitable", "Expired/Filled"],
};

export const KANBAN_COLORS: Record<KanbanColumn, string> = {
  Saved: "border-l-blue-400 bg-blue-50/50", Applied: "border-l-amber-400 bg-amber-50/50",
  Interview: "border-l-violet-400 bg-violet-50/50", Offer: "border-l-emerald-400 bg-emerald-50/50",
  Rejected: "border-l-slate-400 bg-slate-50/50",
};

export const KANBAN_HEADER_COLORS: Record<KanbanColumn, string> = {
  Saved: "text-blue-700 bg-blue-100", Applied: "text-amber-700 bg-amber-100",
  Interview: "text-violet-700 bg-violet-100", Offer: "text-emerald-700 bg-emerald-100",
  Rejected: "text-slate-700 bg-slate-200",
};

// ── Types ────────────────────────────────────────────────────────────────────

export type JobStatus = (typeof JOB_STATUSES)[number];
export type JobPriority = (typeof JOB_PRIORITIES)[number];
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export type Resume = {
  id: string; userId: string; name: string; category?: string; description?: string;
  currentVersionId: string; createdAt: string; updatedAt: string;
};
export type ResumeVersion = {
  id: string; resumeId: string; versionNumber: number; content: string; createdAt: string;
};

export type User = {
  id: string; email: string; name?: string; passwordHash: string; createdAt: string; updatedAt: string;
};
export type Category = {
  id: string; userId: string; name: string; displayOrder: number; createdAt: string; updatedAt: string;
};

export type Job = {
  id: string; categoryId: string; jobNumber: number; title: string; company?: string;
  link?: string; status: JobStatus; priority: JobPriority; deadline?: string;
  dateAdded: string; comments?: string; notes?: string; starred?: boolean;
  duplicateGroupId?: string; createdAt: string; updatedAt: string;
  recruiterName?: string; recruiterEmail?: string; recruiterLinkedIn?: string;
  resumeUsed?: string; resumeId?: string; resumeVersion?: number; applicationNotes?: string;
};

export type ApiKeyRecord = {
  id: string; userId: string; provider: LlmProvider; encryptedKey: string; iv: string;
  maskedKey: string; modelName: string; createdAt: string; updatedAt: string;
};
export type ExperienceEntry = {
  id: string; company: string; title: string; startDate: string; endDate?: string;
  location?: string; description: string;
};
export type EducationEntry = {
  id: string; institution: string; degree: string; field?: string; startDate?: string; endDate?: string;
};
export type LanguageEntry = { language: string; level: string };
export type UserProfile = {
  userId: string; fullName?: string; phone?: string; location?: string; linkedin?: string;
  website?: string; summary?: string; skills: string[]; experience: ExperienceEntry[];
  education: EducationEntry[]; languages: LanguageEntry[]; certifications: string[]; cvText?: string; updatedAt: string;
};
export type Recruiter = {
  id: string; userId: string; name: string; company?: string; email?: string;
  linkedinUrl?: string; phone?: string; notes?: string; createdAt: string; updatedAt: string;
};

export type EmailEventType = "APPLICATION_CONFIRMATION" | "INTERVIEW" | "RECRUITER_OUTREACH" | "ASSESSMENT" | "OFFER" | "REJECTION" | "OTHER";

export type EmailEvent = {
  id: string; userId: string; jobId?: string; recruiterId?: string; matchedJobId?: string;
  type: EmailEventType; subject: string; sender: string; body?: string; company?: string;
  receivedAt: string; processedAt?: string;
};

export type Reminder = {
  id: string; userId: string; jobId?: string; recruiterId?: string;
  title: string; dueDate: string; completed: boolean; createdAt: string;
};

export type JobActivity = {
  id: string; jobId: string; type: "email" | "note" | "status_change" | "follow_up";
  description: string; timestamp: string;
};

export type GmailConfig = {
  connected: boolean; email?: string; lastSyncTime?: string; autoUpdate: boolean;
};

export type JobWithCategory = Job & { categoryName: string };

// ── Internal store shape ─────────────────────────────────────────────────────

type Store = {
  users: User[]; categories: Category[]; jobs: Job[]; apiKeys: ApiKeyRecord[]; profiles: UserProfile[];
  resumes?: Resume[]; resumeVersions?: ResumeVersion[];
  recruiters?: Recruiter[]; emailEvents?: EmailEvent[]; reminders?: Reminder[]; jobActivities?: JobActivity[];
  gmailConfig?: GmailConfig;
};

const STORAGE_KEY = "jobpilot.dev.store.v1";
const SESSION_KEY = "jobpilot.dev.sessionUserId";
const CRYPTO_KEY = "jobpilot.dev.aesKey.v1";

function emptyStore(): Store {
  return { users: [], categories: [], jobs: [], apiKeys: [], profiles: [] };
}

function now() { return new Date().toISOString(); }
export function today() { return new Date().toISOString().slice(0, 10); }

function id() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readStore(): Store {
  if (typeof window === "undefined") return emptyStore();
  try { return { ...emptyStore(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { return emptyStore(); }
}

function writeStore(store: Store) { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }

// ── Auth ─────────────────────────────────────────────────────────────────────

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const uid = localStorage.getItem(SESSION_KEY);
  return uid ? readStore().users.find((u) => u.id === uid) ?? null : null;
}
export function isDemoAccount(user: User | null) { return user?.email === DEMO_ACCOUNT_EMAIL; }

export async function signUpUser(input: { name?: string; email: string; password: string }) {
  const store = readStore();
  const email = input.email.trim().toLowerCase();
  if (store.users.some((u) => u.email === email)) return { ok: false as const, error: "An account with this email already exists." };
  const u: User = { id: id(), email, name: input.name?.trim() || undefined, passwordHash: await hashPassword(input.password), createdAt: now(), updatedAt: now() };
  store.users.push(u); writeStore(store); localStorage.setItem(SESSION_KEY, u.id);
  return { ok: true as const, user: u };
}
export async function logInUser(email: string, password: string) {
  const user = readStore().users.find((u) => u.email === email.trim().toLowerCase());
  if (!user || !(await verifyPassword(password, user.passwordHash))) return { ok: false as const, error: "Invalid email or password." };
  localStorage.setItem(SESSION_KEY, user.id); return { ok: true as const, user };
}
export function logOutUser() { localStorage.removeItem(SESSION_KEY); }

// ── Categories ────────────────────────────────────────────────────────────────

export function getCategories(userId: string) {
  return readStore().categories.filter((c) => c.userId === userId).sort((a, b) => a.displayOrder - b.displayOrder);
}
export function addCategory(userId: string, nameInput: string) {
  const name = nameInput.trim();
  if (!name) return { ok: false as const, error: "Category name is required." };
  const store = readStore();
  if (store.categories.some((c) => c.userId === userId && c.name.toLowerCase() === name.toLowerCase())) return { ok: false as const, error: "Category already exists." };
  const cat: Category = { id: id(), userId, name, displayOrder: store.categories.filter((c) => c.userId === userId).length, createdAt: now(), updatedAt: now() };
  store.categories.push(cat); writeStore(store); return { ok: true as const, category: cat };
}
export function renameCategory(userId: string, id: string, nameInput: string) {
  const name = nameInput.trim();
  const store = readStore();
  const cat = store.categories.find((c) => c.id === id && c.userId === userId);
  if (!cat) return { ok: false as const, error: "Category not found." };
  if (!name) return { ok: false as const, error: "Category name is required." };
  if (store.categories.some((c) => c.userId === userId && c.id !== id && c.name.toLowerCase() === name.toLowerCase())) return { ok: false as const, error: "Category already exists." };
  cat.name = name; cat.updatedAt = now(); writeStore(store); return { ok: true as const, category: cat };
}
export function deleteCategory(userId: string, id: string) {
  const store = readStore();
  store.categories = store.categories.filter((c) => !(c.id === id && c.userId === userId));
  store.jobs = store.jobs.filter((j) => j.categoryId !== id); writeStore(store);
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export function getJobs(userId: string): JobWithCategory[] {
  const store = readStore();
  const catMap = new Map(store.categories.filter((c) => c.userId === userId).map((c) => [c.id, c.name]));
  return store.jobs.filter((j) => catMap.has(j.categoryId)).map((j) => ({ ...j, categoryName: catMap.get(j.categoryId) ?? "Uncategorized" }));
}

export function findDuplicateJob(userId: string, link?: string, ignoreJobId?: string) {
  const normalized = link?.toLowerCase().replace(/\/$/, "") || "";
  if (!normalized) return null;
  return getJobs(userId).find((j) => j.id !== ignoreJobId && j.link?.toLowerCase().replace(/\/$/, "") === normalized) ?? null;
}

export function addJob(userId: string, input: Omit<Job, "id" | "jobNumber" | "createdAt" | "updatedAt" | "dateAdded"> & { dateAdded?: string }) {
  const store = readStore();
  const catIds = new Set(store.categories.filter((c) => c.userId === userId).map((c) => c.id));
  if (!catIds.has(input.categoryId)) return { ok: false as const, error: "Choose a category before saving." };
  const job: Job = { id: id(), ...input, jobNumber: Math.max(0, ...store.jobs.filter((j) => catIds.has(j.categoryId)).map((j) => j.jobNumber)) + 1, dateAdded: input.dateAdded || today(), createdAt: now(), updatedAt: now() };
  store.jobs.push(job); writeStore(store); return { ok: true as const, job };
}

export function updateJob(userId: string, jobId: string, input: Partial<Job>) {
  const store = readStore();
  const catIds = new Set(store.categories.filter((c) => c.userId === userId).map((c) => c.id));
  const job = store.jobs.find((j) => j.id === jobId && catIds.has(j.categoryId));
  if (!job) return { ok: false as const, error: "Job not found." };
  Object.assign(job, input); job.updatedAt = now(); writeStore(store); return { ok: true as const, job };
}

export function deleteJob(userId: string, jobId: string) {
  const store = readStore();
  const catIds = new Set(store.categories.filter((c) => c.userId === userId).map((c) => c.id));
  store.jobs = store.jobs.filter((j) => !(j.id === jobId && catIds.has(j.categoryId))); writeStore(store);
}
export function deleteManyJobs(userId: string, ids: string[]) {
  const store = readStore();
  const catIds = new Set(store.categories.filter((c) => c.userId === userId).map((c) => c.id));
  const idSet = new Set(ids);
  store.jobs = store.jobs.filter((j) => !(idSet.has(j.id) && catIds.has(j.categoryId))); writeStore(store);
}
export function toggleStarJob(userId: string, jobId: string) {
  const store = readStore();
  const catIds = new Set(store.categories.filter((c) => c.userId === userId).map((c) => c.id));
  const job = store.jobs.find((j) => j.id === jobId && catIds.has(j.categoryId));
  if (job) { job.starred = !job.starred; job.updatedAt = now(); writeStore(store); }
}

// ── Similarity ────────────────────────────────────────────────────────────────

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean));
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  const inter = new Set([...a].filter((x) => b.has(x)));
  return inter.size / new Set([...a, ...b]).size;
}
export function findSimilarJobs(userId: string, title: string, link?: string, ignoreJobId?: string): JobWithCategory[] {
  const jobs = getJobs(userId);
  const normLink = link?.toLowerCase().replace(/\/$/, "") || "";
  const tokens = tokenize(title);
  return jobs.filter((j) => j.id !== ignoreJobId && (normLink && j.link?.toLowerCase().replace(/\/$/, "") === normLink || jaccard(tokens, tokenize(j.title)) >= 0.5));
}

// ── Profile ──────────────────────────────────────────────────────────────────

export function getUserProfile(userId: string): UserProfile {
  return readStore().profiles.find((p) => p.userId === userId) || { userId, skills: [], experience: [], education: [], languages: [], certifications: [], updatedAt: now() };
}
export function saveUserProfile(profile: UserProfile): UserProfile {
  const store = readStore(); const u = { ...profile, updatedAt: now() };
  const i = store.profiles.findIndex((p) => p.userId === profile.userId);
  if (i >= 0) store.profiles[i] = u; else store.profiles.push(u);
  writeStore(store); return u;
}

// ── API Keys ──────────────────────────────────────────────────────────────────

export function getApiKeys(userId: string): ApiKeyRecord[] { return readStore().apiKeys.filter((k) => k.userId === userId); }
export async function getDecryptedApiConfig(userId: string) {
  const keys = getApiKeys(userId); if (!keys.length) return null;
  const cfg = keys.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  try {
    const k = await getAesKey();
    const d = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(cfg.iv) }, k, base64ToBytes(cfg.encryptedKey));
    return { provider: cfg.provider, modelName: cfg.modelName || PROVIDER_MODELS[cfg.provider]?.[0] || "gpt-4o-mini", apiKey: new TextDecoder().decode(d) };
  } catch { return null; }
}
export async function saveApiKey(userId: string, provider: LlmProvider, apiKey: string, modelName: string) {
  if (!apiKey.trim()) return { ok: false as const, error: "API key is required." };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getAesKey();
  const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(apiKey.trim()));
  const store = readStore();
  const existing = store.apiKeys.find((k) => k.userId === userId && k.provider === provider);
  const rec = { encryptedKey: bytesToBase64(new Uint8Array(enc)), iv: bytesToBase64(iv), maskedKey: apiKey.trim().slice(0, 4) + "...****", modelName: modelName.trim(), updatedAt: now() };
  if (existing) Object.assign(existing, rec); else store.apiKeys.push({ id: id(), userId, provider, ...rec, createdAt: now() });
  writeStore(store); return { ok: true as const };
}
export function deleteApiKey(userId: string, provider: LlmProvider) {
  const store = readStore();
  store.apiKeys = store.apiKeys.filter((k) => !(k.userId === userId && k.provider === provider)); writeStore(store);
}

// ── Resume CRUD ───────────────────────────────────────────────────────────────

export function getResumes(userId: string) {
  const s = readStore();
  return (s.resumes || []).filter((r) => r.userId === userId).map((r) => {
    const v = s.resumeVersions?.find((v) => v.id === r.currentVersionId);
    return { ...r, versionNumber: v?.versionNumber || 1, content: v?.content || "" };
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export function getResume(id: string) {
  const s = readStore(); const r = s.resumes?.find((r) => r.id === id);
  if (!r) return null;
  const v = s.resumeVersions?.find((v) => v.id === r.currentVersionId);
  return { ...r, versionNumber: v?.versionNumber || 1, content: v?.content || "" };
}
export function getResumeVersions(resumeId: string) {
  return (readStore().resumeVersions || []).filter((v) => v.resumeId === resumeId).sort((a, b) => b.versionNumber - a.versionNumber);
}
export function createResume(userId: string, input: { name: string; category?: string; description?: string; content: string }) {
  const s = readStore(); if (!s.resumes) s.resumes = []; if (!s.resumeVersions) s.resumeVersions = [];
  const rid = id(); const vid = id(); const ts = now();
  const r: Resume = { id: rid, userId, name: input.name.trim(), category: input.category?.trim() || undefined, description: input.description?.trim() || undefined, currentVersionId: vid, createdAt: ts, updatedAt: ts };
  const v: ResumeVersion = { id: vid, resumeId: rid, versionNumber: 1, content: input.content, createdAt: ts };
  s.resumes.push(r); s.resumeVersions.push(v); writeStore(s); return { ...r, versionNumber: 1, content: input.content };
}
export function createNewVersion(userId: string, resumeId: string, content: string) {
  const s = readStore(); const r = s.resumes?.find((r) => r.id === resumeId && r.userId === userId);
  if (!r) return null;
  if (!s.resumeVersions) s.resumeVersions = [];
  const maxV = s.resumeVersions.filter((v) => v.resumeId === resumeId).reduce((m, v) => Math.max(m, v.versionNumber), 0);
  const vid = id(); const ts = now();
  const v: ResumeVersion = { id: vid, resumeId, versionNumber: maxV + 1, content, createdAt: ts };
  s.resumeVersions.push(v); r.currentVersionId = vid; r.updatedAt = ts; writeStore(s);
  return { ...r, versionNumber: maxV + 1, content };
}
export function duplicateResume(userId: string, id: string, newName: string) {
  const orig = getResume(id); if (!orig) return null;
  return createResume(userId, { name: newName || `${orig.name} (Copy)`, category: orig.category, description: orig.description, content: orig.content });
}
export function updateResumeMeta(userId: string, id: string, input: { name?: string; category?: string; description?: string }) {
  const s = readStore(); const r = s.resumes?.find((r) => r.id === id && r.userId === userId);
  if (!r) return null;
  if (input.name !== undefined) r.name = input.name.trim() || r.name;
  if (input.category !== undefined) r.category = input.category?.trim() || undefined;
  if (input.description !== undefined) r.description = input.description?.trim() || undefined;
  r.updatedAt = now(); writeStore(s);
  const v = s.resumeVersions?.find((v) => v.id === r.currentVersionId);
  return { ...r, versionNumber: v?.versionNumber || 1, content: v?.content || "" };
}
export function deleteResume(userId: string, id: string) {
  const s = readStore();
  s.resumes = (s.resumes || []).filter((r) => !(r.id === id && r.userId === userId));
  s.resumeVersions = (s.resumeVersions || []).filter((v) => v.resumeId !== id); writeStore(s);
}
export function getResumePerformance(userId: string) {
  const jobs = getJobs(userId); const resumes = getResumes(userId);
  return resumes.map((r) => {
    const rj = jobs.filter((j) => j.resumeId === r.id);
    return { resume: r, applications: rj.length, interviews: rj.filter((j) => j.status === "Interview").length, offers: rj.filter((j) => j.status === "Offer").length };
  }).sort((a, b) => b.applications - a.applications);
}

// ── Gmail / Inbox / Recruiter / Reminder ──────────────────────────────────────

export function getGmailConfig(): GmailConfig {
  const s = readStore();
  return s.gmailConfig || { connected: false, autoUpdate: true };
}

export function connectGmail(email: string) {
  const s = readStore();
  s.gmailConfig = { connected: true, email, lastSyncTime: now(), autoUpdate: true };
  writeStore(s);
}

export function disconnectGmail() {
  const s = readStore();
  s.gmailConfig = { connected: false, autoUpdate: false };
  writeStore(s);
}

export function getRecruiters(userId: string): Recruiter[] {
  return (readStore().recruiters || []).filter((r) => r.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createRecruiter(userId: string, input: { name: string; company?: string; email?: string; linkedinUrl?: string; phone?: string; notes?: string }): Recruiter {
  const s = readStore(); if (!s.recruiters) s.recruiters = [];
  const r: Recruiter = { id: id(), userId, ...input, createdAt: now(), updatedAt: now() };
  s.recruiters.push(r); writeStore(s); return r;
}

export function updateRecruiter(userId: string, id: string, input: Partial<Recruiter>) {
  const s = readStore(); const r = s.recruiters?.find((r) => r.id === id && r.userId === userId);
  if (!r) return null;
  Object.assign(r, input); r.updatedAt = now(); writeStore(s); return r;
}

export function deleteRecruiter(userId: string, id: string) {
  const s = readStore();
  s.recruiters = (s.recruiters || []).filter((r) => !(r.id === id && r.userId === userId));
  s.emailEvents = (s.emailEvents || []).filter((e) => e.recruiterId !== id);
  writeStore(s);
}

export function getEmailEvents(userId: string): EmailEvent[] {
  return (readStore().emailEvents || []).filter((e) => e.userId === userId).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

export function createEmailEvent(userId: string, input: { type: EmailEventType; subject: string; sender: string; body?: string; company?: string; recruiterId?: string; matchedJobId?: string }): EmailEvent {
  const s = readStore(); if (!s.emailEvents) s.emailEvents = [];
  const e: EmailEvent = { ...input, id: id(), userId, receivedAt: now(), processedAt: now() };
  s.emailEvents.push(e); writeStore(s); return e;
}

export function deleteEmailEvent(id: string) {
  const s = readStore();
  s.emailEvents = (s.emailEvents || []).filter((e) => e.id !== id); writeStore(s);
}

export function getReminders(userId: string): Reminder[] {
  return (readStore().reminders || []).filter((r) => r.userId === userId).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function createReminder(userId: string, input: { jobId?: string; recruiterId?: string; title: string; dueDate: string }): Reminder {
  const s = readStore(); if (!s.reminders) s.reminders = [];
  const r: Reminder = { id: id(), userId, ...input, completed: false, createdAt: now() };
  s.reminders.push(r); writeStore(s); return r;
}

export function toggleReminder(id: string) {
  const s = readStore(); const r = s.reminders?.find((rem) => rem.id === id);
  if (r) { r.completed = !r.completed; writeStore(s); }
}

export function deleteReminder(id: string) {
  const s = readStore();
  s.reminders = (s.reminders || []).filter((r) => r.id !== id); writeStore(s);
}

export function getJobActivities(jobId: string): JobActivity[] {
  return (readStore().jobActivities || []).filter((a) => a.jobId === jobId).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function addJobActivity(userId: string, jobId: string, input: { type: JobActivity["type"]; description: string }) {
  const s = readStore(); if (!s.jobActivities) s.jobActivities = [];
  s.jobActivities.push({ id: id(), jobId, ...input, timestamp: now() }); writeStore(s);
}

const CLASSIFICATION_PATTERNS: { type: EmailEventType; patterns: RegExp[] }[] = [
  { type: "INTERVIEW", patterns: [/interview/i, /interview invitation/i, /schedule.*interview/i, /next (step|round)/i, /technical (screen|interview|assessment)/i, /phone screen/i, /zoom.*interview/i, /meet the team/i, /cultural (fit|interview)/i] },
  { type: "OFFER", patterns: [/offer/i, /offer letter/i, /congratulations.*offer/i, /pleased to offer/i, /excited to offer/i, /compensation package/i, /start date/i, /signing (bonus|package)/i, /offer details/i] },
  { type: "REJECTION", patterns: [/unfortunately/i, /regret to inform/i, /not moving forward/i, /other candidates/i, /not selected/i, /decided to pursue/i, /after careful (consideration|review)/i, /unable to offer/i, /wasn't a fit/i] },
  { type: "APPLICATION_CONFIRMATION", patterns: [/application (received|confirmed|submitted)/i, /thank you for (your |applying|application)/i, /we (received|have) your application/i, /application (status|update)/i, /confirm.*application/i] },
  { type: "RECRUITER_OUTREACH", patterns: [/recruiter/i, /hiring manager/i, /talent acquisition/i, /sourcer/i, /reach(ing)? out/i, /came across your (profile|resume)/i, /interesting (background|experience)/i, /opportunity (at|with)/i, /role.*might.*interest/i] },
  { type: "ASSESSMENT", patterns: [/assessment/i, /coding (challenge|test|exercise)/i, /take.?home (assignment|test|challenge)/i, /hackerrank/i, /codility/i, /leetcode/i, /technical (test|challenge|screen)/i, /online (test|assessment)/i] },
];

export function autoClassifyEmail(body: string): { type: EmailEventType; company?: string; confidence: number } {
  const companyMatch = body.match(/(?:at|from|with)\s+([A-Z][A-Za-z0-9.\s&]+?)(?:\s|,|\.|\n|$)/);
  const company = companyMatch?.[1]?.trim();

  let bestScore = 0;
  let bestType: EmailEventType = "OTHER";

  for (const { type, patterns } of CLASSIFICATION_PATTERNS) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(body)) score += 1;
    }
    if (score > bestScore) { bestScore = score; bestType = type; }
  }

  return { type: bestType, company, confidence: Math.min(bestScore / 3, 1) };
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""; bytes.forEach((b) => { binary += String.fromCharCode(b); }); return btoa(binary);
}
function base64ToBytes(v: string) { return Uint8Array.from(atob(v), (c) => c.charCodeAt(0)); }
async function getAesKey() {
  let raw = localStorage.getItem(CRYPTO_KEY);
  if (!raw) { const b = new Uint8Array(32); crypto.getRandomValues(b); raw = bytesToBase64(b); localStorage.setItem(CRYPTO_KEY, raw); }
  return crypto.subtle.importKey("raw", base64ToBytes(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function hashPassword(password: string, saltHex?: string): Promise<string> {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt as any, iterations: 100_000, hash: "SHA-256" }, km, 256);
  return `pbkdf2:${bytesToHex(salt)}:${bytesToHex(new Uint8Array(bits))}`;
}
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith("pbkdf2:")) return false;
  const p = stored.split(":"); if (p.length !== 3) return false;
  return (await hashPassword(password, p[1])) === stored;
}
function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array((hex.match(/.{1,2}/g) || []).map((b) => parseInt(b, 16)));
}