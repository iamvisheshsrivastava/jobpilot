/**
 * POST /api/digest/weekly
 *
 * Sends each user a weekly summary of their job search activity (jobs
 * added, applications sent, interviews scheduled, offers, rejections, and
 * unread inbox notifications) over Telegram, if they have it connected.
 * Mirrors the cron/session auth pattern used by /api/gmail/sync (issue #22).
 *
 * Called by:
 *   - Vercel cron (weekly, see crons in vercel.json) with header
 *     Authorization: Bearer $CRON_SECRET
 *   - Logged-in user manually, for a preview of their own digest
 *
 * Env vars needed:
 *   CRON_SECRET          — protects the cron endpoint
 *   TELEGRAM_BOT_TOKEN    — see lib/telegram.ts (digest is skipped, not
 *                           failed, for users without Telegram connected)
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { getUser } from "@/lib/auth-ext";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

interface WeeklyStats {
  jobsAdded: number;
  applicationsSent: number;
  interviewsScheduled: number;
  offersReceived: number;
  rejections: number;
  unreadNotifications: number;
  upcomingInterviews: { title: string; company: string | null; interviewDate: Date }[];
}

async function buildWeeklyStats(userId: string, since: Date): Promise<WeeklyStats> {
  const [jobsAdded, applicationsSent, interviewsScheduled, offersReceived, rejections, unreadNotifications, upcomingInterviews] =
    await Promise.all([
      prisma.job.count({ where: { category: { userId }, dateAdded: { gte: since } } }),
      prisma.jobHistory.count({
        where: { newValue: "APPLIED", changedAt: { gte: since }, job: { category: { userId } } },
      }),
      prisma.jobHistory.count({
        where: { newValue: "INTERVIEW", changedAt: { gte: since }, job: { category: { userId } } },
      }),
      prisma.jobHistory.count({
        where: { newValue: "OFFER", changedAt: { gte: since }, job: { category: { userId } } },
      }),
      prisma.jobHistory.count({
        where: { newValue: "REJECTED", changedAt: { gte: since }, job: { category: { userId } } },
      }),
      prisma.notification.count({ where: { userId, read: false } }),
      prisma.job.findMany({
        where: { category: { userId }, interviewDate: { gte: new Date() } },
        select: { title: true, company: true, interviewDate: true },
        orderBy: { interviewDate: "asc" },
        take: 5,
      }),
    ]);

  return {
    jobsAdded,
    applicationsSent,
    interviewsScheduled,
    offersReceived,
    rejections,
    unreadNotifications,
    upcomingInterviews: upcomingInterviews
      .filter((j): j is { title: string; company: string | null; interviewDate: Date } => j.interviewDate !== null)
      .map((j) => ({ title: j.title, company: j.company, interviewDate: j.interviewDate })),
  };
}

function formatDigest(stats: WeeklyStats): string {
  const lines = [
    "📊 <b>Your Weekly JobPilot Digest</b>",
    "",
    `📝 Jobs added: <b>${stats.jobsAdded}</b>`,
    `📤 Applications sent: <b>${stats.applicationsSent}</b>`,
    `🎙 Interviews scheduled: <b>${stats.interviewsScheduled}</b>`,
    `🏆 Offers received: <b>${stats.offersReceived}</b>`,
    `❌ Rejections: <b>${stats.rejections}</b>`,
  ];

  if (stats.upcomingInterviews.length > 0) {
    lines.push("", "<b>Upcoming interviews:</b>");
    for (const iv of stats.upcomingInterviews) {
      const when = iv.interviewDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      lines.push(`  • ${iv.title}${iv.company ? ` @ ${iv.company}` : ""} — ${when}`);
    }
  }

  if (stats.unreadNotifications > 0) {
    lines.push("", `📬 You have ${stats.unreadNotifications} unread inbox notification${stats.unreadNotifications === 1 ? "" : "s"}.`);
  }

  if (stats.jobsAdded === 0 && stats.applicationsSent === 0 && stats.interviewsScheduled === 0) {
    lines.push("", "Quiet week — nothing tracked. Add a job or two to keep the momentum going!");
  }

  return lines.join("\n");
}

async function sendWeeklyDigest(userId: string): Promise<{ sent: boolean; reason?: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramChatId: true } });
  if (!user?.telegramChatId) return { sent: false, reason: "No Telegram connected" };

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stats = await buildWeeklyStats(userId, since);
  await sendTelegramMessage(user.telegramChatId, formatDigest(stats));
  return { sent: true };
}

// ── Route handler ─────────────────────────────────────────────────────────

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
  if (isCronRequest(req)) {
    // Send to every user with Telegram connected
    const users = await prisma.user.findMany({
      where: { telegramChatId: { not: null } },
      select: { id: true },
    });
    let sent = 0;
    for (const { id } of users) {
      try {
        const result = await sendWeeklyDigest(id);
        if (result.sent) sent++;
      } catch (e) {
        console.error(`[digest/weekly] failed for user ${id}:`, e);
        // per-user errors don't abort the rest of the run
      }
    }
    return NextResponse.json({ ok: true, usersConsidered: users.length, sent });
  }

  // Otherwise require a logged-in user previewing/triggering their own digest
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await sendWeeklyDigest(user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[digest/weekly] error:", msg);
    return NextResponse.json({ error: "Failed to send digest. Please try again." }, { status: 500 });
  }
}

// Vercel cron sends GET requests
export async function GET(req: Request) {
  return POST(req);
}
