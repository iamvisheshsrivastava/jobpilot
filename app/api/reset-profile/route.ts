import { NextResponse } from "next/server";
import { getUser, isDemoAccount } from "@/lib/auth-ext";
import { prisma } from "@/lib/prisma";


export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isDemoAccount(user.email)) return NextResponse.json({ error: "Demo account is read-only" }, { status: 403 });

  try {
    // Delete all jobs via their categories (Job.categoryId → Category.userId)
    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const categoryIds = categories.map((c) => c.id);
    if (categoryIds.length > 0) {
      await prisma.job.deleteMany({ where: { categoryId: { in: categoryIds } } });
    }

    // Delete all API keys
    await prisma.apiKey.deleteMany({ where: { userId: user.id } });

    // Delete profile if it exists
    await prisma.userProfile.deleteMany({ where: { userId: user.id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-profile]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
