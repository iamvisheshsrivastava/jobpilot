// ── Constants ────────────────────────────────────────────────────────────────

export const JOB_STATUSES = [
  "In Progress",
  "Applied",
  "Interview",
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

// ── Types ────────────────────────────────────────────────────────────────────

export type JobStatus = (typeof JOB_STATUSES)[number];
export type JobPriority = (typeof JOB_PRIORITIES)[number];
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export type User = {
  id: string;
  email: string;
  name?: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  userId: string;
  name: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Job = {
  id: string;
  categoryId: string;
  jobNumber: number;
  title: string;
  company?: string;
  link?: string;
  status: JobStatus;
  priority: JobPriority;
  deadline?: string;
  dateAdded: string;
  comments?: string;
  notes?: string;
  starred?: boolean;
  duplicateGroupId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiKeyRecord = {
  id: string;
  userId: string;
  provider: LlmProvider;
  encryptedKey: string;
  iv: string;
  maskedKey: string;
  modelName: string;
  createdAt: string;
  updatedAt: string;
};

export type ExperienceEntry = {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  location?: string;
  description: string;
};

export type EducationEntry = {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
};

export type LanguageEntry = {
  language: string;
  level: string;
};

export type UserProfile = {
  userId: string;
  fullName?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  website?: string;
  summary?: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  languages: LanguageEntry[];
  certifications: string[];
  cvText?: string;
  updatedAt: string;
};

export type JobWithCategory = Job & { categoryName: string };

// ── Internal store shape ─────────────────────────────────────────────────────

type Store = {
  users: User[];
  categories: Category[];
  jobs: Job[];
  apiKeys: ApiKeyRecord[];
  profiles: UserProfile[];
};

// ── Storage keys ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "jobpilot.dev.store.v1";
const SESSION_KEY = "jobpilot.dev.sessionUserId";
const CRYPTO_KEY = "jobpilot.dev.aesKey.v1";

// ── Helpers ──────────────────────────────────────────────────────────────────

function emptyStore(): Store {
  return { users: [], categories: [], jobs: [], apiKeys: [], profiles: [] };
}

function now() {
  return new Date().toISOString();
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

function id() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readStore(): Store {
  if (typeof window === "undefined") return emptyStore();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyStore();
  try {
    const parsed = JSON.parse(raw);
    return { ...emptyStore(), ...parsed };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((byte) => parseInt(byte, 16)));
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function getAesKey() {
  let raw = localStorage.getItem(CRYPTO_KEY);
  if (!raw) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    raw = bytesToBase64(bytes);
    localStorage.setItem(CRYPTO_KEY, raw);
  }
  return crypto.subtle.importKey("raw", base64ToBytes(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
}

// ── Password hashing (PBKDF2) ─────────────────────────────────────────────────

async function hashPassword(password: string, saltHex?: string): Promise<string> {
  const salt = saltHex
    ? hexToBytes(saltHex)
    : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { name: "PBKDF2", salt: salt as any, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return `pbkdf2:${bytesToHex(salt)}:${bytesToHex(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith("pbkdf2:")) return false;
  const parts = stored.split(":");
  if (parts.length !== 3) return false;
  const recomputed = await hashPassword(password, parts[1]);
  return recomputed === stored;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeUrl(url?: string) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`.toLowerCase().replace(/\/$/, "");
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, "");
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const userId = localStorage.getItem(SESSION_KEY);
  if (!userId) return null;
  return readStore().users.find((user) => user.id === userId) ?? null;
}

export function isDemoAccount(user: User | null) {
  return user?.email === DEMO_ACCOUNT_EMAIL;
}

export async function signUpUser(input: { name?: string; email: string; password: string }) {
  const store = readStore();
  const email = normalizeEmail(input.email);
  if (store.users.some((user) => user.email === email)) {
    return { ok: false as const, error: "An account with this email already exists." };
  }
  const timestamp = now();
  const user: User = {
    id: id(),
    email,
    name: input.name?.trim() || undefined,
    passwordHash: await hashPassword(input.password),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.users.push(user);
  writeStore(store);
  localStorage.setItem(SESSION_KEY, user.id);
  return { ok: true as const, user };
}

export async function logInUser(emailInput: string, password: string) {
  const email = normalizeEmail(emailInput);
  const user = readStore().users.find((item) => item.email === email);
  if (!user) {
    return { ok: false as const, error: "Invalid email or password." };
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { ok: false as const, error: "Invalid email or password." };
  }
  localStorage.setItem(SESSION_KEY, user.id);
  return { ok: true as const, user };
}

export function logOutUser() {
  localStorage.removeItem(SESSION_KEY);
}

export function updateUserProfile(userId: string, name: string) {
  const store = readStore();
  const user = store.users.find((item) => item.id === userId);
  if (!user) return null;
  user.name = name.trim() || undefined;
  user.updatedAt = now();
  writeStore(store);
  return user;
}

export async function changeUserPassword(userId: string, currentPassword: string, newPassword: string) {
  const store = readStore();
  const user = store.users.find((item) => item.id === userId);
  if (!user) return { ok: false as const, error: "User not found." };
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return { ok: false as const, error: "Current password is incorrect." };
  }
  user.passwordHash = await hashPassword(newPassword);
  user.updatedAt = now();
  writeStore(store);
  return { ok: true as const };
}

// ── Categories ────────────────────────────────────────────────────────────────

export function getCategories(userId: string) {
  return readStore()
    .categories.filter((category) => category.userId === userId)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
}

export function addCategory(userId: string, nameInput: string) {
  const name = nameInput.trim();
  if (!name) return { ok: false as const, error: "Category name is required." };
  const store = readStore();
  const siblings = store.categories.filter((category) => category.userId === userId);
  if (siblings.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false as const, error: "Category already exists." };
  }
  const timestamp = now();
  const category: Category = {
    id: id(),
    userId,
    name,
    displayOrder: siblings.length,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.categories.push(category);
  writeStore(store);
  return { ok: true as const, category };
}

export function renameCategory(userId: string, categoryId: string, nameInput: string) {
  const name = nameInput.trim();
  const store = readStore();
  const category = store.categories.find((item) => item.id === categoryId && item.userId === userId);
  if (!category) return { ok: false as const, error: "Category not found." };
  if (!name) return { ok: false as const, error: "Category name is required." };
  if (
    store.categories.some(
      (item) => item.userId === userId && item.id !== categoryId && item.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    return { ok: false as const, error: "Category already exists." };
  }
  category.name = name;
  category.updatedAt = now();
  writeStore(store);
  return { ok: true as const, category };
}

export function deleteCategory(userId: string, categoryId: string) {
  const store = readStore();
  store.categories = store.categories.filter((category) => !(category.id === categoryId && category.userId === userId));
  store.jobs = store.jobs.filter((job) => job.categoryId !== categoryId);
  writeStore(store);
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export function getJobs(userId: string): JobWithCategory[] {
  const store = readStore();
  const categoryMap = new Map(
    store.categories.filter((category) => category.userId === userId).map((category) => [category.id, category.name]),
  );
  return store.jobs
    .filter((job) => categoryMap.has(job.categoryId))
    .map((job) => ({ ...job, categoryName: categoryMap.get(job.categoryId) ?? "Uncategorized" }));
}

export function findDuplicateJob(userId: string, link?: string, ignoreJobId?: string) {
  const normalized = normalizeUrl(link);
  if (!normalized) return null;
  return (
    getJobs(userId).find((job) => job.id !== ignoreJobId && normalizeUrl(job.link) === normalized) ?? null
  );
}

export function addJob(
  userId: string,
  input: Omit<Job, "id" | "jobNumber" | "createdAt" | "updatedAt" | "dateAdded"> & { dateAdded?: string },
) {
  const store = readStore();
  const userCategoryIds = new Set(
    store.categories.filter((category) => category.userId === userId).map((category) => category.id),
  );
  if (!userCategoryIds.has(input.categoryId)) {
    return { ok: false as const, error: "Choose a category before saving." };
  }
  const userJobs = store.jobs.filter((job) => userCategoryIds.has(job.categoryId));
  const timestamp = now();
  const job: Job = {
    id: id(),
    categoryId: input.categoryId,
    jobNumber: Math.max(0, ...userJobs.map((item) => item.jobNumber || 0)) + 1,
    title: input.title.trim(),
    company: input.company?.trim() || undefined,
    link: input.link?.trim() || undefined,
    status: input.status,
    priority: input.priority,
    deadline: input.deadline || undefined,
    dateAdded: input.dateAdded || today(),
    comments: input.comments?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    starred: input.starred ?? false,
    duplicateGroupId: input.duplicateGroupId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.jobs.push(job);
  writeStore(store);
  return { ok: true as const, job };
}

export function updateJob(userId: string, jobId: string, input: Partial<Job>) {
  const store = readStore();
  const allowedCategoryIds = new Set(
    store.categories.filter((category) => category.userId === userId).map((category) => category.id),
  );
  const job = store.jobs.find((item) => item.id === jobId && allowedCategoryIds.has(item.categoryId));
  if (!job) return { ok: false as const, error: "Job not found." };
  if (input.categoryId && !allowedCategoryIds.has(input.categoryId)) {
    return { ok: false as const, error: "Choose a valid category." };
  }
  if (input.categoryId !== undefined) job.categoryId = input.categoryId;
  if (input.title !== undefined) job.title = input.title.trim();
  if (input.company !== undefined) job.company = input.company.trim() || undefined;
  if (input.link !== undefined) job.link = input.link.trim() || undefined;
  if (input.status !== undefined) job.status = input.status;
  if (input.priority !== undefined) job.priority = input.priority;
  if (input.deadline !== undefined) job.deadline = input.deadline || undefined;
  if (input.dateAdded !== undefined) job.dateAdded = input.dateAdded;
  if (input.comments !== undefined) job.comments = input.comments.trim() || undefined;
  if (input.notes !== undefined) job.notes = input.notes.trim() || undefined;
  if (input.starred !== undefined) job.starred = input.starred;
  if (input.duplicateGroupId !== undefined) job.duplicateGroupId = input.duplicateGroupId || undefined;
  job.updatedAt = now();
  writeStore(store);
  return { ok: true as const, job };
}

export function deleteJob(userId: string, jobId: string) {
  const store = readStore();
  const categoryIds = new Set(
    store.categories.filter((category) => category.userId === userId).map((category) => category.id),
  );
  store.jobs = store.jobs.filter((job) => !(job.id === jobId && categoryIds.has(job.categoryId)));
  writeStore(store);
}

export function deleteManyJobs(userId: string, jobIds: string[]) {
  const store = readStore();
  const categoryIds = new Set(
    store.categories.filter((category) => category.userId === userId).map((category) => category.id),
  );
  const idSet = new Set(jobIds);
  store.jobs = store.jobs.filter((job) => !(idSet.has(job.id) && categoryIds.has(job.categoryId)));
  writeStore(store);
}

export function toggleStarJob(userId: string, jobId: string) {
  const store = readStore();
  const categoryIds = new Set(
    store.categories.filter((category) => category.userId === userId).map((category) => category.id),
  );
  const job = store.jobs.find((j) => j.id === jobId && categoryIds.has(j.categoryId));
  if (!job) return;
  job.starred = !job.starred;
  job.updatedAt = now();
  writeStore(store);
}

// ── Jaccard similarity duplicate detection ────────────────────────────────────

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const aArr = Array.from(a);
  const intersection = new Set(aArr.filter((t) => b.has(t)));
  const union = new Set([...aArr, ...Array.from(b)]);
  return intersection.size / union.size;
}

export function findSimilarJobs(userId: string, title: string, link?: string, ignoreJobId?: string): JobWithCategory[] {
  const jobs = getJobs(userId);
  const normalizedLink = normalizeUrl(link);
  const titleTokens = tokenize(title);

  return jobs.filter((job) => {
    if (job.id === ignoreJobId) return false;
    // Exact URL match
    if (normalizedLink && normalizeUrl(job.link) === normalizedLink) return true;
    // Jaccard similarity on title
    const sim = jaccardSimilarity(titleTokens, tokenize(job.title));
    return sim >= 0.5;
  });
}

export function deleteAllJobs(userId: string) {
  const store = readStore();
  const categoryIds = new Set(
    store.categories.filter((category) => category.userId === userId).map((category) => category.id),
  );
  store.jobs = store.jobs.filter((job) => !categoryIds.has(job.categoryId));
  writeStore(store);
}

export function deleteAccount(userId: string) {
  const store = readStore();
  const categoryIds = new Set(
    store.categories.filter((category) => category.userId === userId).map((category) => category.id),
  );
  store.users = store.users.filter((user) => user.id !== userId);
  store.categories = store.categories.filter((category) => category.userId !== userId);
  store.jobs = store.jobs.filter((job) => !categoryIds.has(job.categoryId));
  store.apiKeys = store.apiKeys.filter((key) => key.userId !== userId);
  store.profiles = store.profiles.filter((p) => p.userId !== userId);
  writeStore(store);
  logOutUser();
}

// ── User Profile (CV data) ────────────────────────────────────────────────────

function emptyProfile(userId: string): UserProfile {
  return {
    userId,
    skills: [],
    experience: [],
    education: [],
    languages: [],
    certifications: [],
    updatedAt: now(),
  };
}

export function getUserProfile(userId: string): UserProfile {
  return readStore().profiles.find((p) => p.userId === userId) ?? emptyProfile(userId);
}

export function saveUserProfile(profile: UserProfile): UserProfile {
  const store = readStore();
  const updated = { ...profile, updatedAt: now() };
  const idx = store.profiles.findIndex((p) => p.userId === profile.userId);
  if (idx >= 0) {
    store.profiles[idx] = updated;
  } else {
    store.profiles.push(updated);
  }
  writeStore(store);
  return updated;
}

// ── API Keys ──────────────────────────────────────────────────────────────────

async function encryptApiKey(apiKey: string) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const key = await getAesKey();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(apiKey),
  );
  return {
    encryptedKey: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  };
}

function maskApiKey(apiKey: string) {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 8) return "****";
  const prefix = trimmed.includes("_") ? trimmed.slice(0, trimmed.indexOf("_") + 1) : trimmed.slice(0, 4);
  return `${prefix}...****`;
}

export function getApiKeys(userId: string): ApiKeyRecord[] {
  return readStore().apiKeys.filter((key) => key.userId === userId);
}

/** Returns the most recently updated API config for LLM calls, with decrypted key. */
export async function getDecryptedApiConfig(
  userId: string,
): Promise<{ provider: LlmProvider; modelName: string; apiKey: string } | null> {
  const keys = getApiKeys(userId);
  if (keys.length === 0) return null;
  const config = [...keys].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  try {
    const aesKey = await getAesKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(config.iv) },
      aesKey,
      base64ToBytes(config.encryptedKey),
    );
    const apiKey = new TextDecoder().decode(decrypted);
    const modelName =
      config.modelName || PROVIDER_MODELS[config.provider]?.[0] || "gpt-4o-mini";
    return { provider: config.provider, modelName, apiKey };
  } catch {
    return null;
  }
}

export async function saveApiKey(
  userId: string,
  provider: LlmProvider,
  apiKey: string,
  modelName: string,
) {
  const trimmed = apiKey.trim();
  if (!trimmed) return { ok: false as const, error: "API key is required." };
  if (!modelName.trim()) return { ok: false as const, error: "Model name is required." };
  const encrypted = await encryptApiKey(trimmed);
  const store = readStore();
  const timestamp = now();
  const existing = store.apiKeys.find((key) => key.userId === userId && key.provider === provider);
  if (existing) {
    existing.encryptedKey = encrypted.encryptedKey;
    existing.iv = encrypted.iv;
    existing.maskedKey = maskApiKey(trimmed);
    existing.modelName = modelName.trim();
    existing.updatedAt = timestamp;
  } else {
    store.apiKeys.push({
      id: id(),
      userId,
      provider,
      encryptedKey: encrypted.encryptedKey,
      iv: encrypted.iv,
      maskedKey: maskApiKey(trimmed),
      modelName: modelName.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
  writeStore(store);
  return { ok: true as const };
}

export function deleteApiKey(userId: string, provider: LlmProvider) {
  const store = readStore();
  store.apiKeys = store.apiKeys.filter((key) => !(key.userId === userId && key.provider === provider));
  writeStore(store);
}
