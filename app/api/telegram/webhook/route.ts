import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/telegram/webhook
 * Telegram sends updates here. We look for /start <linkToken> messages
 * and save the chat_id to the user's record.
 */
export async function POST(req: Request) {
  try {
    // Telegram signs webhook requests with the secret_token configured via
    // setWebhook - without checking it, anyone on the internet can POST a
    // forged update here. Fail closed if the secret isn't configured.
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!configuredSecret) {
      console.error("[telegram/webhook] TELEGRAM_WEBHOOK_SECRET is not set - rejecting request");
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    const providedSecret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
    const a = Buffer.from(providedSecret);
    const b = Buffer.from(configuredSecret);
    const secretMatches = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!secretMatches) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const update = await req.json() as {
      message?: {
        chat: { id: number };
        from?: { first_name?: string };
        text?: string;
      };
    };

    const message = update.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = String(message.chat.id);
    const text = message.text?.trim() ?? "";

    // Expect /start <linkToken> (a single-use token minted by
    // GET /api/telegram/status, not the raw userId)
    const match = text.match(/^\/start\s+(.+)$/);
    if (!match) {
      // Send generic reply
      await sendReply(chatId, "👋 Hi! To connect this bot to your JobPilot account, go to <b>Settings → Integrations → Connect Telegram</b> and click the link there.");
      return NextResponse.json({ ok: true });
    }

    const linkToken = match[1].trim();

    const record = await prisma.telegramLinkToken.findUnique({ where: { token: linkToken } });

    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      await sendReply(chatId, "❌ This connect link is invalid or has expired. Please generate a new one from JobPilot Settings.");
      return NextResponse.json({ ok: true });
    }

    // Save chat_id to user and burn the token in one go
    const user = await prisma.$transaction(async (tx) => {
      await tx.telegramLinkToken.update({
        where: { token: linkToken },
        data: { usedAt: new Date() },
      });
      return tx.user.update({
        where: { id: record.userId },
        data: { telegramChatId: chatId },
      });
    }).catch(() => null);

    if (!user) {
      await sendReply(chatId, "❌ Could not link your account. Please try the connect link again from JobPilot settings.");
      return NextResponse.json({ ok: true });
    }

    await sendReply(
      chatId,
      `✅ <b>Connected!</b> You'll now receive job notifications here.\n\nHello ${user.name || user.email.split("@")[0]} 👋`,
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[telegram/webhook] error:", e);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

async function sendReply(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  }).catch(() => {});
}
