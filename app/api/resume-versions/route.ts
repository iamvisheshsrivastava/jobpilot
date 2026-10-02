import { isDemoAccount } from '@/lib/auth-ext'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSafeUrl } from '@/lib/validation'


function isValidFileUrl(value: string): boolean {
  return value.startsWith('data:') || value.startsWith('r2://') || isSafeUrl(value)
}

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

  // Interview counts for all versions in a single grouped query instead of
  // one prisma.job.count call per version (N+1).
  const interviewCounts = await prisma.job.groupBy({
    by: ['resumeVersionId'],
    where: {
      resumeVersionId: { in: versions.map((v) => v.id) },
      status: 'INTERVIEW',
    },
    _count: { _all: true },
  })
  const interviewCountByVersionId = new Map(
    interviewCounts.map((c) => [c.resumeVersionId as string, c._count._all]),
  )

  const result = versions.map((v) => ({
    id: v.id,
    userId: v.userId,
    name: v.name,
    fileUrl: v.fileUrl,
    notes: v.notes,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
    applications: v._count.jobs,
    interviews: interviewCountByVersionId.get(v.id) ?? 0,
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (isDemoAccount(session.user.email)) {
    return NextResponse.json({ error: 'Demo account is read-only' }, { status: 403 })
  }

  const { name, notes, fileUrl } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (fileUrl?.trim() && !isValidFileUrl(fileUrl.trim())) {
    return NextResponse.json({ error: 'File URL must be a valid http(s) URL' }, { status: 400 })
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