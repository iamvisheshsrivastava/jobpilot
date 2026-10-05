import { NextResponse } from "next/server";
import { getUser, isDemoAccount } from "@/lib/auth-ext";
import { prisma } from "@/lib/prisma";
import { logIntegrationEvent } from "@/lib/integration-events";

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isDemoAccount(user.email)) return NextResponse.json({ error: "Demo account is read-only" }, { status: 403 });

  const existing = await prisma.gmailToken.findUnique({ where: { userId: user.id }, select: { email: true } });
  await prisma.gmailToken.deleteMany({ where: { userId: user.id } });
  if (existing) await logIntegrationEvent(user.id, "GMAIL", "DISCONNECT", existing.email);
  return NextResponse.json({ ok: true });
}
