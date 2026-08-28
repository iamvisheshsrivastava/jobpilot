import { NextResponse } from "next/server";
import crypto from "crypto";
import { getUser } from "@/lib/auth-ext";
import { prisma } from "@/lib/prisma";

const LINK_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { telegramChatId: true },
  });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "";
  let connectUrl: string | null = null;

  if (botUsername) {
    // Single-use, short-lived, unguessable token instead of the raw userId -
    // cuid()s aren't secret and can leak via URLs/logs, which would let an
    // attacker link their own Telegram chat to a victim's account.
    const token = crypto.randomBytes(24).toString("base64url");
    await prisma.telegramLinkToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + LINK_TOKEN_TTL_MS),
      },
    });
    connectUrl = `https://t.me/${botUsername}?start=${token}`;
  }

  return NextResponse.json({
    connected: !!dbUser?.telegramChatId,
    botConfigured: !!botUsername,
    connectUrl,
  });
}

export async function DELETE(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: user.id },
    data: { telegramChatId: null },
  });

  return NextResponse.json({ ok: true });
}
