import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth-ext";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { telegramChatId: true },
  });

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "";
  const connectUrl = botUsername
    ? `https://t.me/${botUsername}?start=${user.id}`
    : null;

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
