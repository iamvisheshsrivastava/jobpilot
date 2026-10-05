import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth-ext";
import { prisma } from "@/lib/prisma";

// GET /api/integration-events — recent connect/disconnect audit trail for
// Settings → Integrations (issue #7).
export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events = await prisma.integrationEvent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ events });
}
