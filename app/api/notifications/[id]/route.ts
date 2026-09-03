import { NextResponse } from "next/server";
import { getUser, isDemoAccount } from "@/lib/auth-ext";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isDemoAccount(user.email)) return NextResponse.json({ error: "Demo account is read-only" }, { status: 403 });

  await prisma.notification.updateMany({
    where: { id: params.id, userId: user.id },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
