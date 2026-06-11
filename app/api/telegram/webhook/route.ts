import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/telegram/webhook
 * Telegram sends updates here. We look for /start <userId> messages
 * and save the chat_id to the user's record.
 */
export async function POST(req: Request) {
  try {
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

    // Expect /start <userId>
    const match = text.match(/^\/start\s+(.+)$/);
    if (!match) {
      // Send generic reply
      await sendReply(chatId, "👋 Hi! To connect this bot to your JobPilot account, go to <b>Settings → Integrations → Connect Telegram</b> and click the link there.");
      return NextResponse.json({ ok: true });
    }

    const userId = match[1].trim();

    // Save chat_id to user
    const user = await prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: chatId },
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
