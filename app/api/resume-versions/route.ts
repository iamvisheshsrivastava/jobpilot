import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSafeUrl } from '@/lib/validation'

const DEMO_EMAIL = 'demo@jobpilot.app'

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
  if (session.user.email === DEMO_EMAIL) {
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