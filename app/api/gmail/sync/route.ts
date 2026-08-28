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
import crypto from "crypto";
import { getUser } from "@/lib/auth-ext";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt, safeDecrypt } from "@/lib/crypto";
import { sendTelegramMessage } from "@/lib/telegram";

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
      // Downscope: older tokens were granted gmail.metadata, which makes the
      // Gmail API reject the 'q' search parameter (403). Requesting only the
      // scopes we need strips gmail.metadata from the new access token.
      scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email",
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
}, forceRefresh = false): Promise<string> {
  // Refresh if expires within 5 minutes
  if (forceRefresh || new Date(gmailToken.expiresAt).getTime() - Date.now() < 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(safeDecrypt(gmailToken.refreshToken));
    await prisma.gmailToken.update({
      where: { id: gmailToken.id },
      data: { accessToken: encrypt(refreshed.accessToken), expiresAt: refreshed.expiresAt },
    });
    return refreshed.accessToken;
  }
  return safeDecrypt(gmailToken.accessToken);
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

interface SyncResult { created: number; debug: Record<string, unknown> }

async function syncUserGmail(userId: string): Promise<SyncResult> {
  const debug: Record<string, unknown> = {};

  const [gmailToken, user] = await Promise.all([
    prisma.gmailToken.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { telegramChatId: true } }),
  ]);
  if (!gmailToken) { debug.error = "No Gmail token found for user"; return { created: 0, debug }; }

  debug.tokenEmail = (gmailToken as Record<string, unknown>).email ?? "unknown";
  debug.tokenExpiry = gmailToken.expiresAt;
  debug.lastSyncAt = gmailToken.lastSyncAt;

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(gmailToken);
    debug.tokenRefreshed = new Date(gmailToken.expiresAt).getTime() - Date.now() < 5 * 60 * 1000;
  } catch (e) {
    debug.error = `Token refresh failed: ${e instanceof Error ? e.message : String(e)}`;
    return { created: 0, debug };
  }

  // Fetch LLM key for this user
  const keyRec = await prisma.apiKey.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  // Only query emails since last sync (or last 24h if first sync)
  // Subtract 10-minute overlap so emails arriving just before last sync aren't missed
  const after = gmailToken.lastSyncAt
    ? Math.floor((gmailToken.lastSyncAt.getTime() - 10 * 60 * 1000) / 1000)
    : Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

  const query = `(job OR application OR interview OR offer OR rejection OR position OR opportunity OR hiring OR recruiter) after:${after}`;
  debug.gmailQuery = query;

  // Page through all matching messages instead of stopping at 20 - on an
  // active inbox that silently dropped every email past the first page, and
  // because lastSyncAt still advanced afterwards, the overflow was gone for
  // good (fell outside next run's `after:` window). Cap total pages fetched
  // so one user's huge inbox can't make a cron run hang.
  const MAX_MESSAGES_PER_RUN = 200;
  const messages: GmailMessage[] = [];
  let pageToken: string | undefined;
  let truncated = false;

  do {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    url.searchParams.set("maxResults", "100");
    url.searchParams.set("q", query);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    let listRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    let listData = await listRes.json();

    // A still-valid access token issued before the downscoping fix may carry
    // gmail.metadata, which rejects 'q'. Force one refresh (which downscopes)
    // and retry. Only needs to happen once, on the first page.
    if (!pageToken && listRes.status === 403 && JSON.stringify(listData).includes("Metadata scope")) {
      debug.metadataScopeRetry = true;
      try {
        accessToken = await getValidAccessToken(gmailToken, true);
      } catch (e) {
        debug.error = `Token refresh failed on metadata-scope retry: ${e instanceof Error ? e.message : String(e)}`;
        return { created: 0, debug };
      }
      listRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      listData = await listRes.json();
    }

    if (!listRes.ok) {
      debug.error = `Gmail API error ${listRes.status}: ${JSON.stringify(listData)}`;
      return { created: 0, debug };
    }

    messages.push(...(listData.messages ?? []));
    pageToken = listData.nextPageToken;

    if (messages.length >= MAX_MESSAGES_PER_RUN) {
      truncated = !!pageToken;
      break;
    }
  } while (pageToken);

  debug.messagesFound = messages.length;
  debug.truncated = truncated;

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

    // Push Telegram notification if user has it connected
    if (user?.telegramChatId) {
      const emoji: Record<EmailType, string> = {
        REJECTION: "❌", INTERVIEW: "🎉", OFFER: "🏆",
        APPLICATION_CONFIRMATION: "✅", OTHER: "📧",
      };
      await sendTelegramMessage(
        user.telegramChatId,
        `${emoji[type]} <b>${titles[type]}</b>\n<i>From:</i> ${from}\n<i>Subject:</i> ${subject}\n\n${summary}`,
      );
    }

    created++;
  }

  // Only advance lastSyncAt when this run actually drained the query - if we
  // hit MAX_MESSAGES_PER_RUN with more pages left, advancing it would permanently
  // skip whatever we didn't get to. Leaving it unchanged means next run
  // re-covers the same window; already-processed messages are deduped above
  // via the gmailMsgId lookup, so this is safe to retry.
  if (!truncated) {
    await prisma.gmailToken.update({
      where: { userId },
      data: { lastSyncAt: new Date() },
    });
  }

  return { created, debug };
}

// ── Route handler ─────────────────────────────────────────────────────────────

function isCronRequest(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false; // fail closed when unset, rather than accepting "Bearer undefined"

  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  // Allow cron calls with CRON_SECRET
  if (isCronRequest(req)) {
    // Sync ALL users with Gmail connected
    const tokens = await prisma.gmailToken.findMany({ select: { userId: true } });
    let total = 0;
    for (const { userId } of tokens) {
      try { total += (await syncUserGmail(userId)).created; } catch { /* per-user errors don't abort others */ }
    }
    return NextResponse.json({ ok: true, synced: tokens.length, notifications: total });
  }

  // Otherwise require user session
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { created, debug } = await syncUserGmail(user.id);
    // The debug object carries internal details (token email, exact Gmail
    // search query, raw upstream error bodies) - useful while developing,
    // not something to hand to the browser in production.
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ ok: true, notifications: created, debug });
    }
    console.log("[gmail/sync] debug:", debug);
    return NextResponse.json({ ok: true, notifications: created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[gmail/sync] error:", msg);
    return NextResponse.json({ error: "Sync failed. Please try again." }, { status: 500 });
  }
}

// Vercel cron sends GET requests
export async function GET(req: Request) {
  return POST(req);
}
