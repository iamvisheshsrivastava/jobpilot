/**
 * POST /api/gmail/sync
 *
 * Called by:
 *   - Vercel cron (hourly) with header Authorization: Bearer $CRON_SECRET
 *   - Logged-in user manually (normal session)
 *
 * Env vars needed:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET — for refreshing access tokens
 *   CRON_SECRET                            — protects the cron endpoint
 */
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth-ext";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error_description ?? "Token refresh failed");
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
  };
}

async function getValidAccessToken(gmailToken: {
  accessToken: string; refreshToken: string; expiresAt: Date; id: string
}): Promise<string> {
  // Refresh if expires within 5 minutes
  if (new Date(gmailToken.expiresAt).getTime() - Date.now() < 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(gmailToken.refreshToken);
    await prisma.gmailToken.update({
      where: { id: gmailToken.id },
      data: { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt },
    });
    return refreshed.accessToken;
  }
  return gmailToken.accessToken;
}

interface GmailMessage { id: string; threadId: string }
interface GmailPart  { mimeType: string; body: { data?: string }; parts?: GmailPart[] }
interface GmailMsg   { id: string; snippet: string; internalDate: string; payload: { headers: { name: string; value: string }[]; parts?: GmailPart[]; body?: { data?: string } } }

function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function extractText(payload: GmailMsg["payload"]): string {
  if (payload.body?.data) return decodeBase64(payload.body.data);
  function walk(parts: GmailPart[]): string {
    for (const p of parts) {
      if (p.mimeType === "text/plain" && p.body?.data) return decodeBase64(p.body.data);
      if (p.parts) { const r = walk(p.parts); if (r) return r; }
    }
    for (const p of parts) {
      if (p.mimeType === "text/html" && p.body?.data) return decodeBase64(p.body.data).replace(/<[^>]+>/g, " ");
      if (p.parts) { const r = walk(p.parts); if (r) return r; }
    }
    return "";
  }
  return payload.parts ? walk(payload.parts) : "";
}

function header(msg: GmailMsg, name: string): string {
  return msg.payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

type EmailType = "REJECTION" | "INTERVIEW" | "OFFER" | "APPLICATION_CONFIRMATION" | "OTHER";

async function classifyEmail(subject: string, body: string, apiKey: string, modelName: string, baseUrl: string, provider: string): Promise<{ type: EmailType; summary: string }> {
  const prompt = `Classify this job application email. Reply with ONLY valid JSON: {"type":"REJECTION"|"INTERVIEW"|"OFFER"|"APPLICATION_CONFIRMATION"|"OTHER","summary":"one sentence summary max 20 words"}

Subject: ${subject}
Body (first 800 chars): ${body.slice(0, 800)}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (provider === "OpenRouter" || provider === "OPENROUTER") {
    headers["HTTP-Referer"] = "https://jobpilot.app";
    headers["X-Title"] = "JobPilot";
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: modelName,
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) return { type: "OTHER", summary: subject.slice(0, 80) };
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    return { type: parsed.type ?? "OTHER", summary: parsed.summary ?? subject.slice(0, 80) };
  } catch {
    return { type: "OTHER", summary: subject.slice(0, 80) };
  }
}

// ── Main sync function for one user ──────────────────────────────────────────

async function syncUserGmail(userId: string): Promise<number> {
  const gmailToken = await prisma.gmailToken.findUnique({ where: { userId } });
  if (!gmailToken) return 0;

  const accessToken = await getValidAccessToken(gmailToken);

  // Fetch LLM key for this user
  const keyRec = await prisma.apiKey.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  // Only query emails since last sync (or last 24h if first sync)
  const after = gmailToken.lastSyncAt
    ? Math.floor(gmailToken.lastSyncAt.getTime() / 1000)
    : Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

  const query = `is:unread (job OR application OR interview OR offer OR rejection OR position OR opportunity OR hiring OR recruiter) after:${after}`;
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) return 0;
  const listData = await listRes.json();
  const messages: GmailMessage[] = listData.messages ?? [];

  let created = 0;
  const OPENAI_URLS: Record<string, string> = {
    GROQ: "https://api.groq.com/openai/v1",
    OPENROUTER: "https://openrouter.ai/api/v1",
    OPENAI: "https://api.openai.com/v1",
    OpenAI: "https://api.openai.com/v1",
    Groq: "https://api.groq.com/openai/v1",
    OpenRouter: "https://openrouter.ai/api/v1",
  };
  const MODEL_DEFAULTS: Record<string, string> = {
    GROQ: "llama-3.3-70b-versatile",
    OPENROUTER: "meta-llama/llama-3.3-70b-instruct:free",
    OPENAI: "gpt-4o-mini",
  };

  for (const { id: msgId } of messages) {
    // Skip already-processed
    const exists = await prisma.notification.findUnique({ where: { gmailMsgId: msgId } });
    if (exists) continue;

    // Fetch full message
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!msgRes.ok) continue;
    const msg: GmailMsg = await msgRes.json();

    const subject = header(msg, "subject") || "(no subject)";
    const from = header(msg, "from");
    const emailDate = new Date(parseInt(msg.internalDate));
    const body = extractText(msg.payload);

    let type: EmailType = "OTHER";
    let summary = subject.slice(0, 100);

    // Try AI classification if user has LLM key
    if (keyRec) {
      try {
        const decryptedKey = decrypt(keyRec.encryptedKey);
        const provider = keyRec.provider;
        const baseUrl = OPENAI_URLS[provider] ?? OPENAI_URLS.OpenAI;
        const model = keyRec.modelName ?? MODEL_DEFAULTS[provider] ?? "gpt-4o-mini";
        const result = await classifyEmail(subject, body, decryptedKey, model, baseUrl, provider);
        type = result.type;
        summary = result.summary;
      } catch { /* fall through to keyword matching */ }
    }

    // Fallback keyword classification
    if (type === "OTHER") {
      const lower = (subject + " " + body.slice(0, 400)).toLowerCase();
      if (/unfortunately|regret|not moving forward|other candidate|not selected/.test(lower)) type = "REJECTION";
      else if (/interview|schedule|call|meeting|speak with/.test(lower)) type = "INTERVIEW";
      else if (/offer|congratulations|pleased to offer|salary|compensation/.test(lower)) type = "OFFER";
      else if (/received your application|thank you for applying|application confirmed/.test(lower)) type = "APPLICATION_CONFIRMATION";
    }

    const titles: Record<EmailType, string> = {
      REJECTION: "Application rejected",
      INTERVIEW: "Interview invitation",
      OFFER: "Job offer received",
      APPLICATION_CONFIRMATION: "Application confirmed",
      OTHER: "Job-related email",
    };

    await prisma.notification.create({
      data: {
        userId,
        type,
        title: titles[type],
        body: summary,
        emailFrom: from,
        emailSubject: subject,
        emailDate,
        gmailMsgId: msgId,
      },
    });
    created++;
  }

  // Update lastSyncAt
  await prisma.gmailToken.update({
    where: { userId },
    data: { lastSyncAt: new Date() },
  });

  return created;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;

  // Allow cron calls with CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Sync ALL users with Gmail connected
    const tokens = await prisma.gmailToken.findMany({ select: { userId: true } });
    let total = 0;
    for (const { userId } of tokens) {
      try { total += await syncUserGmail(userId); } catch { /* per-user errors don't abort others */ }
    }
    return NextResponse.json({ ok: true, synced: tokens.length, notifications: total });
  }

  // Otherwise require user session
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const count = await syncUserGmail(user.id);
    return NextResponse.json({ ok: true, notifications: count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Vercel cron sends GET requests
export async function GET(req: Request) {
  return POST(req);
}
