import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const versions = await prisma.resumeVersion.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { jobs: true } },
    },
  })

  // For each version, also count interviews among linked jobs
  const result = await Promise.all(
    versions.map(async (v) => {
      const interviewCount = await prisma.job.count({
        where: { resumeVersionId: v.id, status: 'INTERVIEW' },
      })
      return {
        id: v.id,
        userId: v.userId,
        name: v.name,
        fileUrl: v.fileUrl,
        notes: v.notes,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
        applications: v._count.jobs,
        interviews: interviewCount,
      }
    }),
  )

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, notes, fileUrl } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const version = await prisma.resumeVersion.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      notes: notes?.trim() || null,
      fileUrl: fileUrl?.trim() || null,
    },
  })

  return NextResponse.json(
    {
      id: version.id,
      userId: version.userId,
      name: version.name,
      fileUrl: version.fileUrl,
      notes: version.notes,
      createdAt: version.createdAt.toISOString(),
      updatedAt: version.updatedAt.toISOString(),
      applications: 0,
      interviews: 0,
    },
    { status: 201 },
  )
}