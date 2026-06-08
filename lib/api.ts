// ── Re-export types from jobpilot-store (the UI still uses these) ─────────────
export type {
  JobStatus,
  JobPriority,
  LlmProvider,
  Category,
  Job,
  ApiKeyRecord,
  ExperienceEntry,
  EducationEntry,
  LanguageEntry,
  UserProfile,
  JobWithCategory,
} from './jobpilot-store'

export {
  JOB_STATUSES,
  JOB_PRIORITIES,
  LLM_PROVIDERS,
  PROVIDER_MODELS,
  DEMO_ACCOUNT_EMAIL,
  today,
} from './jobpilot-store'

import type { Category, Job, JobWithCategory, ApiKeyRecord, UserProfile, JobStatus, JobPriority } from './jobpilot-store'
import { JOB_STATUSES, JOB_PRIORITIES } from './jobpilot-store'

// ── DB ↔ UI value maps ────────────────────────────────────────────────────────

const DB_TO_UI_STATUS: Record<string, JobStatus> = {
  IN_PROGRESS: 'In Progress',
  APPLIED: 'Applied',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  LOOK_AGAIN: 'Look Again',
  REJECTED: 'Rejected',
  NOT_SUITABLE: 'Not Suitable',
  EXPIRED_FILLED: 'Expired/Filled',
}

const UI_TO_DB_STATUS: Record<JobStatus, string> = {
  'In Progress': 'IN_PROGRESS',
  Applied: 'APPLIED',
  Interview: 'INTERVIEW',
  Offer: 'OFFER',
  'Look Again': 'LOOK_AGAIN',
  Rejected: 'REJECTED',
  'Not Suitable': 'NOT_SUITABLE',
  'Expired/Filled': 'EXPIRED_FILLED',
}

const DB_TO_UI_PRIORITY: Record<string, JobPriority> = {
  SUPER_HIGH: 'Super High',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

const UI_TO_DB_PRIORITY: Record<JobPriority, string> = {
  'Super High': 'SUPER_HIGH',
  High: 'HIGH',
  Medium: 'MEDIUM',
  Low: 'LOW',
}

function toUiStatus(dbVal: string): JobStatus {
  return DB_TO_UI_STATUS[dbVal] ?? (JOB_STATUSES.includes(dbVal as JobStatus) ? (dbVal as JobStatus) : 'In Progress')
}

function toUiPriority(dbVal: string): JobPriority {
  return DB_TO_UI_PRIORITY[dbVal] ?? (JOB_PRIORITIES.includes(dbVal as JobPriority) ? (dbVal as JobPriority) : 'Medium')
}

function toDbStatus(uiVal: JobStatus): string {
  return UI_TO_DB_STATUS[uiVal] ?? uiVal
}

function toDbPriority(uiVal: JobPriority): string {
  return UI_TO_DB_PRIORITY[uiVal] ?? uiVal
}

// ── Transform raw API job → UI Job ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapJob(raw: any): JobWithCategory {
  return {
    id: raw.id,
    categoryId: raw.categoryId ?? raw.category_id,
    categoryName: raw.category?.name ?? '',
    jobNumber: raw.jobNumber ?? raw.job_number ?? 0,
    title: raw.title,
    company: raw.company ?? undefined,
    link: raw.link ?? undefined,
    status: toUiStatus(raw.status),
    priority: toUiPriority(raw.priority),
    deadline: raw.deadline ? raw.deadline.slice(0, 10) : undefined,
    dateAdded: raw.dateAdded
      ? raw.dateAdded.slice(0, 10)
      : raw.date_added
        ? raw.date_added.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    comments: raw.comments ?? undefined,
    notes: raw.note?.content ?? undefined,
    starred: raw.starred ?? false,
    duplicateGroupId: raw.duplicateGroupId ?? raw.duplicate_group_id ?? undefined,
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
    recruiterName: raw.recruiterName ?? raw.recruiter_name ?? undefined,
    recruiterEmail: raw.recruiterEmail ?? raw.recruiter_email ?? undefined,
    recruiterLinkedIn: raw.recruiterLinkedIn ?? raw.recruiter_linkedin ?? undefined,
    resumeUsed: raw.resumeUsed ?? raw.resume_used ?? undefined,
    applicationNotes: raw.applicationNotes ?? raw.application_notes ?? undefined,
    resumeId: raw.resumeId ?? raw.resume_id ?? undefined,
    resumeVersionId: raw.resumeVersionId ?? raw.resume_version_id ?? undefined,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCategory(raw: any): Category {
  return {
    id: raw.id,
    userId: raw.userId ?? raw.user_id ?? '',
    name: raw.name,
    displayOrder: raw.displayOrder ?? raw.display_order ?? 0,
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiKey(raw: any): ApiKeyRecord {
  return {
    id: raw.id,
    userId: raw.userId ?? raw.user_id ?? '',
    provider: raw.provider,
    encryptedKey: raw.encryptedKey ?? raw.encrypted_key ?? '',
    iv: raw.iv ?? '',
    maskedKey: raw.maskedKey ?? raw.masked_key ?? '****',
    modelName: raw.modelName ?? raw.model_name ?? '',
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
  }
}

function parseJsonField<T>(val: string | T[] | null | undefined, fallback: T[]): T[] {
  if (!val) return fallback
  if (Array.isArray(val)) return val
  try { return JSON.parse(val as string) } catch { return fallback }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(raw: any): UserProfile {
  return {
    userId: raw.userId ?? raw.user_id ?? '',
    summary: raw.summary ?? undefined,
    cvText: raw.cvText ?? raw.cv_text ?? undefined,
    experience: parseJsonField(raw.experience, []),
    education: parseJsonField(raw.education, []),
    skills: parseJsonField(raw.skills, []),
    languages: parseJsonField(raw.languages, []),
    certifications: parseJsonField(raw.certifications, []),
    updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
    // Optional fields from store type — keep if present
    fullName: raw.fullName,
    phone: raw.phone,
    location: raw.location,
    linkedin: raw.linkedin,
    website: raw.website,
  }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) } })
  if (res.status === 204) return null
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
  return json
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  const data = await apiFetch('/api/categories')
  return (data ?? []).map(mapCategory)
}

export async function createCategory(name: string): Promise<{ ok: boolean; category?: Category; error?: string }> {
  try {
    const data = await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify({ name }) })
    return { ok: true, category: mapCategory(data) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function renameCategory(id: string, name: string): Promise<{ ok: boolean; category?: Category; error?: string }> {
  try {
    const data = await apiFetch(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) })
    return { ok: true, category: mapCategory(data) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function deleteCategory(id: string): Promise<void> {
  await apiFetch(`/api/categories/${id}`, { method: 'DELETE' })
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export type FetchJobsParams = {
  categoryId?: string
  search?: string
  status?: string
  page?: number
  limit?: number
}

export async function fetchJobs(params?: FetchJobsParams): Promise<{ jobs: JobWithCategory[]; total: number; pages: number }> {
  const q = new URLSearchParams()
  if (params?.categoryId) q.set('categoryId', params.categoryId)
  if (params?.search) q.set('search', params.search)
  if (params?.status) q.set('status', params.status)
  if (params?.page) q.set('page', String(params.page))
  if (params?.limit) q.set('limit', String(params.limit))
  const data = await apiFetch(`/api/jobs?${q}`)
  return {
    jobs: (data.jobs ?? []).map(mapJob),
    total: data.total ?? 0,
    pages: data.pages ?? 1,
  }
}

export async function createJob(jobData: {
  categoryId: string
  title: string
  company?: string
  link?: string
  status: JobStatus
  priority: JobPriority
  deadline?: string
  comments?: string
}): Promise<{ ok: boolean; job?: JobWithCategory; error?: string }> {
  try {
    const data = await apiFetch('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({
        ...jobData,
        status: toDbStatus(jobData.status),
        priority: toDbPriority(jobData.priority),
      }),
    })
    return { ok: true, job: mapJob(data) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function updateJob(id: string, jobData: Partial<{
  categoryId: string
  title: string
  company: string
  link: string
  status: JobStatus
  priority: JobPriority
  deadline: string
  comments: string
  notes: string
  starred: boolean
  duplicateGroupId: string
}>): Promise<{ ok: boolean; job?: JobWithCategory; error?: string }> {
  try {
    const body: Record<string, unknown> = { ...jobData }
    if (jobData.status) body.status = toDbStatus(jobData.status)
    if (jobData.priority) body.priority = toDbPriority(jobData.priority)
    if (jobData.notes !== undefined) {
      body.pageNote = jobData.notes
      delete body.notes
    }
    const data = await apiFetch(`/api/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    return { ok: true, job: mapJob(data) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function deleteJob(id: string): Promise<void> {
  await apiFetch(`/api/jobs/${id}`, { method: 'DELETE' })
}

export async function deleteManyJobs(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteJob(id)))
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function fetchProfile(): Promise<UserProfile> {
  const data = await apiFetch('/api/profile')
  return mapProfile(data ?? {})
}

export async function saveProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
  const data = await apiFetch('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(profileData),
  })
  return mapProfile(data)
}

// ── API Keys ──────────────────────────────────────────────────────────────────

export async function fetchApiKeys(): Promise<ApiKeyRecord[]> {
  const data = await apiFetch('/api/api-keys')
  return (data ?? []).map(mapApiKey)
}

export async function saveApiKey(keyData: { provider: string; key: string; modelName?: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiFetch('/api/api-keys', { method: 'POST', body: JSON.stringify(keyData) })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function deleteApiKey(id: string): Promise<void> {
  await apiFetch(`/api/api-keys/${id}`, { method: 'DELETE' })
}

// ── Duplicate / similar job detection (client-side) ──────────────────────────

function normalizeUrl(url?: string) {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`.toLowerCase().replace(/\/$/, '')
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, '')
  }
}

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean))
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  const aArr = Array.from(a)
  const intersection = new Set(aArr.filter((t) => b.has(t)))
  const union = new Set([...aArr, ...Array.from(b)])
  return intersection.size / union.size
}

export function findSimilarJobs(jobs: JobWithCategory[], title: string, link?: string, ignoreJobId?: string): JobWithCategory[] {
  const normalizedLink = normalizeUrl(link)
  const titleTokens = tokenize(title)
  return jobs.filter((job) => {
    if (job.id === ignoreJobId) return false
    if (normalizedLink && normalizeUrl(job.link) === normalizedLink) return true
    return jaccardSimilarity(titleTokens, tokenize(job.title)) >= 0.5
  })
}
