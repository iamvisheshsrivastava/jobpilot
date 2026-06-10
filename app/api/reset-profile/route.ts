import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth-ext";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
