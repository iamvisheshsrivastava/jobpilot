import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth-ext";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await prisma.gmailToken.findUnique({ where: { userId: user.id } });
  if (!token) return NextResponse.json({ connected: false });

  return NextResponse.json({
    connected: true,
    email: token.email,
    lastSyncAt: token.lastSyncAt,
  });
}
