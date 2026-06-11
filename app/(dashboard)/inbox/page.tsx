"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle, Bell, BellOff, Calendar, CheckCheck,
  ExternalLink, Inbox as InboxIcon, Loader2, Mail,
  MailOpen, RefreshCw, Unplug, Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  emailFrom: string | null;
  emailSubject: string | null;
  emailDate: string | null;
  createdAt: string;
}

const TYPE_STYLES: Record<string, string> = {
  REJECTION:               "bg-red-100 text-red-700 border-red-200",
  INTERVIEW:               "bg-violet-100 text-violet-700 border-violet-200",
  OFFER:                   "bg-emerald-100 text-emerald-700 border-emerald-200",
  APPLICATION_CONFIRMATION:"bg-blue-100 text-blue-700 border-blue-200",
  OTHER:                   "bg-slate-100 text-slate-600 border-slate-200",
};

const TYPE_LABELS: Record<string, string> = {
  REJECTION:               "Rejection",
  INTERVIEW:               "Interview",
  OFFER:                   "Offer",
  APPLICATION_CONFIRMATION:"Confirmed",
  OTHER:                   "Other",
};

const TYPE_ICONS: Record<string, typeof Mail> = {
  REJECTION: BellOff,
  INTERVIEW: Calendar,
  OFFER: Bell,
  APPLICATION_CONFIRMATION: MailOpen,
  OTHER: Mail,
};

export default function InboxPage() {
  const searchParams = useSearchParams();
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; email?: string; lastSyncAt?: string } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const gmailParam = searchParams.get("gmail");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, notifRes] = await Promise.all([
        fetch("/api/gmail/status"),
        fetch("/api/notifications"),
      ]);
      if (statusRes.ok) setGmailStatus(await statusRes.json());
      if (notifRes.ok) {
        const d = await notifRes.json();
        setNotifications(d.notifications ?? []);
        setUnreadCount(d.unreadCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (gmailParam === "connected") setSyncMsg("Gmail connected! Syncing your emails…");
    if (gmailParam === "error") setSyncMsg("Gmail connection failed. Please try again.");
  }, [gmailParam]);

  async function handleConnect() {
    // Check if OAuth is configured before redirecting
    try {
      const check = await fetch("/api/auth/gmail/check");
      if (check.status === 503) {
        setSyncMsg("Gmail OAuth is not configured yet. See the setup steps below.");
        return;
      }
    } catch {
      // If check endpoint doesn't exist, just proceed with redirect
    }
    window.location.href = "/api/auth/gmail";
  }

  async function handleDisconnect() {
    await fetch("/api/gmail/disconnect", { method: "POST" });
    setGmailStatus({ connected: false });
    setNotifications([]);
    setUnreadCount(0);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setSyncMsg(data.notifications > 0 ? `Found ${data.notifications} new email${data.notifications !== 1 ? "s" : ""}.` : "All caught up — no new emails.");
        await loadData();
      } else {
        setSyncMsg(data.error ?? "Sync failed.");
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleMarkAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function handleMarkRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "all") return true;
    return n.type === filter;
  });

  const tabs = [
    { id: "all",   label: "All" },
    { id: "unread",label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
    { id: "INTERVIEW",               label: "Interviews" },
    { id: "OFFER",                   label: "Offers" },
    { id: "REJECTION",               label: "Rejections" },
    { id: "APPLICATION_CONFIRMATION",label: "Confirmations" },
  ];

  const oauthConfigured = true; // always show connect option; the API will return 503 if env vars missing

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inbox</h1>
          <p className="mt-0.5 text-sm text-slate-500">Job-related emails detected by AI</p>
        </div>
        {gmailStatus?.connected && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {syncing ? "Syncing…" : "Sync Now"}
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" className="gap-2" onClick={handleMarkAllRead}>
                <CheckCheck className="size-4" /> Mark all read
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Sync message */}
      {syncMsg && (
        <div className={cn(
          "rounded-lg border px-4 py-3 text-sm",
          syncMsg.includes("failed") || syncMsg.includes("error")
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        )}>
          {syncMsg}
        </div>
      )}

      {/* Gmail connection card */}
      <div className={cn(
        "rounded-xl border p-5",
        gmailStatus?.connected
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white"
      )}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex size-10 items-center justify-center rounded-xl",
              gmailStatus?.connected ? "bg-emerald-100" : "bg-slate-100"
            )}>
              {gmailStatus?.connected
                ? <Wifi className="size-5 text-emerald-600" />
                : <Mail className="size-5 text-slate-500" />
              }
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                {gmailStatus?.connected ? "Gmail Connected" : "Connect Gmail"}
              </p>
              {gmailStatus?.connected ? (
                <p className="text-xs text-slate-500">
                  {gmailStatus.email} · Last sync: {gmailStatus.lastSyncAt
                    ? new Date(gmailStatus.lastSyncAt).toLocaleString()
                    : "Never"}
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Automatically detect rejections, interviews, and offers from your Gmail.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {gmailStatus?.connected ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={handleDisconnect}
              >
                <Unplug className="size-4" /> Disconnect
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-2 bg-violet-600 text-white hover:bg-violet-700"
                onClick={handleConnect}
              >
                <Mail className="size-4" /> Connect Gmail
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* Notifications list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="mr-2 size-5 animate-spin" /> Loading…
        </div>
      ) : !gmailStatus?.connected ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-slate-400">
          <InboxIcon className="size-12 opacity-30" />
          <p className="text-sm">Connect Gmail to see job-related emails here.</p>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-slate-400">
              <InboxIcon className="size-12 opacity-30" />
              <p className="text-sm">
                {filter === "unread" ? "No unread emails." : "No emails in this category yet."}
              </p>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleSync} disabled={syncing}>
                {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Sync Now
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((n) => {
                const Icon = TYPE_ICONS[n.type] ?? Mail;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-4 rounded-xl border bg-white p-4 transition-all",
                      n.read ? "opacity-70" : "shadow-sm",
                    )}
                    onClick={() => !n.read && handleMarkRead(n.id)}
                  >
                    <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border", TYPE_STYLES[n.type] ?? TYPE_STYLES.OTHER)}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold", TYPE_STYLES[n.type] ?? TYPE_STYLES.OTHER)}>
                          {TYPE_LABELS[n.type] ?? n.type}
                        </span>
                        {!n.read && (
                          <span className="size-2 rounded-full bg-violet-500" title="Unread" />
                        )}
                        <span className="text-xs text-slate-400 ml-auto">
                          {n.emailDate
                            ? new Date(n.emailDate).toLocaleDateString()
                            : new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-800">{n.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{n.body}</p>
                      {n.emailFrom && (
                        <p className="mt-1 truncate text-[11px] text-slate-400">From: {n.emailFrom}</p>
                      )}
                    </div>
                    {!n.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Mark as read"
                      >
                        <MailOpen className="size-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SMS info note */}
      {gmailStatus?.connected && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          <p className="font-medium text-slate-700">SMS Notifications</p>
          <p className="mt-1">SMS alerts for offers and interviews can be enabled by adding <code className="font-mono">TWILIO_ACCOUNT_SID</code>, <code className="font-mono">TWILIO_AUTH_TOKEN</code>, <code className="font-mono">TWILIO_FROM</code>, and your phone in Settings → Profile.</p>
        </div>
      )}
    </div>
  );
}
