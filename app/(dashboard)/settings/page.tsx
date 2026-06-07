"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ApiKeyRecord,
  changeUserPassword,
  deleteAccount,
  deleteAllJobs,
  deleteApiKey,
  getApiKeys,
  getCurrentUser,
  isDemoAccount,
  LlmProvider,
  LLM_PROVIDERS,
  PROVIDER_MODELS,
  saveApiKey,
  updateUserProfile,
  User,
} from "@/lib/jobpilot-store";

type Tab = "profile" | "api" | "danger";

const CUSTOM_MODEL = "custom";

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");
  const [user, setUser] = useState<User | null>(null);
  const isDemo = isDemoAccount(user);

  // Profile
  const [name, setName] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  // API keys
  const [provider, setProvider] = useState<LlmProvider>("OpenAI");
  const [modelPreset, setModelPreset] = useState(PROVIDER_MODELS["OpenAI"][0]);
  const [customModel, setCustomModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiMessage, setApiMessage] = useState("");
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);

  // Danger zone
  const [deleteJobsText, setDeleteJobsText] = useState("");
  const [deleteAccountText, setDeleteAccountText] = useState("");
  const [dangerMessage, setDangerMessage] = useState("");

  function refresh() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    setUser(currentUser);
    setName(currentUser.name || "");
    setApiKeys(getApiKeys(currentUser.id));
  }

  useEffect(() => { refresh(); }, []);

  // When provider changes, reset model preset to first option
  useEffect(() => {
    const models = PROVIDER_MODELS[provider];
    setModelPreset(models[0]);
    setCustomModel("");
  }, [provider]);

  const effectiveModel = modelPreset === CUSTOM_MODEL ? customModel : modelPreset;

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isDemo) return;
    updateUserProfile(user.id, name);
    setProfileMessage("Profile updated ✓");
    setTimeout(() => setProfileMessage(""), 3000);
    refresh();
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isDemo) return;
    setPasswordMessage("");
    if (newPassword.length < 8) {
      setPasswordMessage("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match.");
      return;
    }
    const result = await changeUserPassword(user.id, currentPassword, newPassword);
    if (!result.ok) { setPasswordMessage(result.error); return; }
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    setPasswordMessage("Password changed ✓");
    setTimeout(() => setPasswordMessage(""), 3000);
  }

  async function handleApiSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setApiMessage("");
    if (!effectiveModel.trim()) {
      setApiMessage("Please enter a model name.");
      return;
    }
    const result = await saveApiKey(user.id, provider, apiKey, effectiveModel.trim());
    if (!result.ok) { setApiMessage(result.error); return; }
    setApiKey("");
    setApiMessage(`${provider} key saved ✓`);
    setTimeout(() => setApiMessage(""), 3000);
    setApiKeys(getApiKeys(user.id));
  }

  function handleDeleteApiKey(item: ApiKeyRecord) {
    if (!user) return;
    deleteApiKey(user.id, item.provider);
    setApiKeys(getApiKeys(user.id));
  }

  function handleDeleteAllJobs() {
    if (!user || isDemo || deleteJobsText !== "DELETE") return;
    deleteAllJobs(user.id);
    setDeleteJobsText("");
    setDangerMessage("All jobs deleted.");
  }

  function handleDeleteAccount() {
    if (!user || isDemo || deleteAccountText !== "DELETE") return;
    deleteAccount(user.id);
    router.push("/");
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "api", label: "API Keys" },
    { id: "danger", label: "Danger Zone" },
  ];

  const presetModels = PROVIDER_MODELS[provider];
  const showCustomInput = modelPreset === CUSTOM_MODEL;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id} type="button" onClick={() => setTab(t.id)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ────────────────────────────────────────────────────── */}
      {tab === "profile" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Profile</h2>
            <p className="mt-0.5 text-sm text-slate-500">Keep your account details current.</p>
            <form className="mt-4 space-y-4" onSubmit={handleProfileSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isDemo} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ""} readOnly className="bg-slate-50 text-slate-500" />
              </div>
              {profileMessage ? <p className="text-sm font-medium text-emerald-600">{profileMessage}</p> : null}
              <Button type="submit" className="bg-blue-500 text-white hover:bg-blue-600" disabled={isDemo}>
                Save Profile
              </Button>
              {isDemo && <p className="text-xs text-amber-600">Profile editing is disabled in the demo account.</p>}
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Change Password</h2>
            <p className="mt-0.5 text-sm text-slate-500">Update your login password.</p>
            <form className="mt-4 space-y-4" onSubmit={handlePasswordSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={isDemo} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New password</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isDemo} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmNewPassword">Confirm new password</Label>
                <Input id="confirmNewPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isDemo} />
              </div>
              {passwordMessage ? (
                <p className={cn("text-sm font-medium", passwordMessage.includes("✓") ? "text-emerald-600" : "text-red-600")}>{passwordMessage}</p>
              ) : null}
              <Button type="submit" className="bg-blue-500 text-white hover:bg-blue-600" disabled={isDemo}>
                Change Password
              </Button>
              {isDemo && <p className="text-xs text-amber-600">Password change is disabled in the demo account.</p>}
            </form>
          </div>
        </div>
      )}

      {/* ── API Keys tab ────────────────────────────────────────────────────── */}
      {tab === "api" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">LLM Configuration</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Configure your AI provider to enable CV analysis and job suitability checks.
              The most recently saved key will be used automatically.
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleApiSubmit}>
              {/* Provider */}
              <div className="space-y-1.5">
                <Label htmlFor="provider">Model Provider</Label>
                <select
                  id="provider"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as LlmProvider)}
                >
                  {LLM_PROVIDERS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>

              {/* Model */}
              <div className="space-y-1.5">
                <Label htmlFor="modelPreset">Model</Label>
                <select
                  id="modelPreset"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  value={modelPreset}
                  onChange={(e) => setModelPreset(e.target.value)}
                >
                  {presetModels.map((m) => (
                    <option key={m} value={m}>
                      {m === CUSTOM_MODEL ? "Custom model name…" : m}
                    </option>
                  ))}
                  {!presetModels.includes(CUSTOM_MODEL) && (
                    <option value={CUSTOM_MODEL}>Custom model name…</option>
                  )}
                </select>
                {showCustomInput && (
                  <Input
                    placeholder="e.g. gpt-4o-mini or mistralai/mixtral-8x7b-instruct"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Paste your ${provider} API key here`}
                    className="flex-1"
                  />
                  <Button
                    type="button" variant="outline" size="icon"
                    onClick={() => setShowApiKey((v) => !v)}
                    aria-label={showApiKey ? "Hide key" : "Show key"}
                  >
                    {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
              </div>

              {apiMessage ? (
                <p className={cn("text-sm font-medium", apiMessage.includes("✓") ? "text-emerald-600" : "text-red-600")}>
                  {apiMessage}
                </p>
              ) : null}

              <Button type="submit" className="bg-blue-500 text-white hover:bg-blue-600">
                Save Configuration
              </Button>
            </form>

            {/* Provider help links */}
            <div className="mt-5 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <p className="font-medium mb-1.5">Get your API key:</p>
              <div className="flex flex-wrap gap-3 text-xs">
                {[
                  { label: "OpenAI", url: "https://platform.openai.com/api-keys" },
                  { label: "Anthropic", url: "https://console.anthropic.com" },
                  { label: "Gemini", url: "https://aistudio.google.com/app/apikey" },
                  { label: "Groq (free)", url: "https://console.groq.com" },
                  { label: "OpenRouter", url: "https://openrouter.ai/keys" },
                ].map(({ label, url }) => (
                  <a key={label} href={url} target="_blank" rel="noreferrer"
                    className="underline underline-offset-2 hover:text-blue-900">
                    {label} →
                  </a>
                ))}
              </div>
              <p className="mt-2 text-xs text-blue-600">
                Keys are encrypted locally with AES-256. They are never sent to our servers.
              </p>
            </div>
          </div>

          {/* Saved configs */}
          {apiKeys.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">Saved Configurations</h3>
              <p className="mt-0.5 mb-4 text-sm text-slate-500">The most recently saved will be used for AI features.</p>
              <div className="space-y-2">
                {[...apiKeys].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((item, i) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-4 py-3",
                      i === 0 ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50",
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {i === 0 && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs shrink-0">Active</Badge>
                      )}
                      <Badge variant="secondary" className="shrink-0">{item.provider}</Badge>
                      <span className="text-sm font-medium text-slate-700 truncate">{item.modelName || "—"}</span>
                      <span className="font-mono text-xs text-slate-400">{item.maskedKey}</span>
                    </div>
                    <Button
                      type="button" variant="outline" size="sm"
                      className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 shrink-0"
                      onClick={() => handleDeleteApiKey(item)}
                    >
                      <Trash2 className="size-3.5" /> Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Danger Zone tab ─────────────────────────────────────────────────── */}
      {tab === "danger" && (
        <div className="rounded-xl border border-red-200 bg-white p-5">
          <h2 className="font-semibold text-red-700">Danger Zone</h2>
          <p className="mt-0.5 text-sm text-slate-500">These actions are permanent and cannot be undone.</p>

          {isDemo ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Danger zone actions are disabled for the demo account.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                <h3 className="font-medium text-slate-800">Delete All My Jobs</h3>
                <p className="mt-1 text-sm text-slate-500">Type <span className="font-mono font-semibold">DELETE</span> to remove all tracked jobs.</p>
                <div className="mt-3 flex items-center gap-3">
                  <Input className="max-w-40" value={deleteJobsText} onChange={(e) => setDeleteJobsText(e.target.value)} placeholder="DELETE" />
                  <Button type="button" variant="destructive" disabled={deleteJobsText !== "DELETE"} onClick={handleDeleteAllJobs}>
                    Delete All Jobs
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                <h3 className="font-medium text-slate-800">Delete My Account</h3>
                <p className="mt-1 text-sm text-slate-500">Type <span className="font-mono font-semibold">DELETE</span> to permanently remove your account and all data.</p>
                <div className="mt-3 flex items-center gap-3">
                  <Input className="max-w-40" value={deleteAccountText} onChange={(e) => setDeleteAccountText(e.target.value)} placeholder="DELETE" />
                  <Button type="button" variant="destructive" disabled={deleteAccountText !== "DELETE"} onClick={handleDeleteAccount}>
                    Delete Account
                  </Button>
                </div>
              </div>

              {dangerMessage ? <p className="text-sm font-medium text-red-700">{dangerMessage}</p> : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
