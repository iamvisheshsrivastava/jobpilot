import { NextResponse } from "next/server";
import { getUser, isDemoAccount } from "@/lib/auth-ext";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isDemoAccount(user.email)) return NextResponse.json({ error: "Demo account is read-only" }, { status: 403 });

  await prisma.gmailToken.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}
