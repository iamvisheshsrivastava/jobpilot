/**
 * POST/GET /api/cron/interview-reminders
 *
 * Finds jobs with an `interviewDate` in the next 24h that haven't already
 * been reminded about, creates an INTERVIEW Notification row, and pushes a
 * Telegram message if the user has linked Telegram. Mirrors the
 * CRON_SECRET-guarded pattern already used by /api/gmail/sync (issue #20).
 *
 * Env vars needed:
 *   CRON_SECRET — protects this endpoint
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

function isCronRequest(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false; // fail closed when unset, rather than accepting "Bearer undefined"

  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function sendReminders(): Promise<{ reminded: number }> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dueJobs = await prisma.job.findMany({
    where: {
      interviewDate: { gte: now, lte: in24h },
      interviewReminderSentAt: null,
    },
    include: { category: { select: { userId: true } } },
  });

  let reminded = 0;
  for (const job of dueJobs) {
    const userId = job.category.userId;
    try {
      // Claim this job's reminder first (gated on interviewReminderSentAt
      // still being null) so two concurrent cron runs can't both send it -
      // same TOCTOU shape that #26 fixed for Gmail sync.
      const claimed = await prisma.job.updateMany({
        where: { id: job.id, interviewReminderSentAt: null },
        data: { interviewReminderSentAt: now },
      });
      if (claimed.count === 0) continue; // another run already claimed it

      const when = job.interviewDate!.toLocaleString(undefined, {
        weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
      });
      const summary = `Interview for ${job.title}${job.company ? ` at ${job.company}` : ""} — ${when}`;

      await prisma.notification.create({
        data: {
          userId,
          type: "INTERVIEW",
          title: "Upcoming interview",
          body: summary,
          emailSubject: job.title,
        },
      });

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramChatId: true } });
      if (user?.telegramChatId) {
        const location = job.interviewLocation ? `\n<i>Where:</i> ${job.interviewLocation}` : "";
        await sendTelegramMessage(
          user.telegramChatId,
          `🎙 <b>Interview reminder</b>\n${summary}${location}`,
        );
      }

      reminded++;
    } catch (e) {
      console.error(`[cron/interview-reminders] failed for job ${job.id}:`, e);
      // per-job errors don't abort the rest of the run
    }
  }

  return { reminded };
}

export async function POST(req: Request) {
  if (!isCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { reminded } = await sendReminders();
    return NextResponse.json({ ok: true, reminded });
  } catch (err) {
    console.error("[cron/interview-reminders] error:", err);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}

// Vercel cron sends GET requests
export async function GET(req: Request) {
  return POST(req);
}
