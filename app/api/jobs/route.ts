import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-ext'
import { prisma } from '@/lib/prisma'

type JobStatus = string
type JobPriority = string

const DEMO_EMAIL = 'demo@jobpilot.app'

export async function GET(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId')
  const status = searchParams.get('status') as JobStatus | null
  const search = searchParams.get('search') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '10'))

  if (categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: categoryId, userId: user.id } })
    if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  const where = {
    category: { userId: user.id },
    ...(categoryId ? { categoryId } : {}),
    ...(status ? { status } : {}),
    ...(search ? { OR: [
      { title: { contains: search, mode: 'insensitive' as const } },
      { company: { contains: search, mode: 'insensitive' as const } },
    ]} : {}),
  }

  const [jobs, total] = await prisma.$transaction([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { category: { select: { id: true, name: true } }, note: { select: { content: true } } },
    }),
    prisma.job.count({ where }),
  ])

  return NextResponse.json({ jobs, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.email === DEMO_EMAIL) return NextResponse.json({ error: 'Demo account is read-only' }, { status: 403 })

  const body = await req.json()
  const { title, company, link, categoryId, status, priority, deadline, comments, pageNote } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!categoryId) return NextResponse.json({ error: 'Category is required' }, { status: 400 })

  const cat = await prisma.category.findFirst({ where: { id: categoryId, userId: user.id } })
  if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  const maxJob = await prisma.job.aggregate({
    where: { category: { userId: user.id } },
    _max: { jobNumber: true },
  })
  const jobNumber = (maxJob._max.jobNumber ?? 0) + 1

  const job = await prisma.job.create({
    data: {
      categoryId,
      jobNumber,
      title: title.trim(),
      company: company?.trim() || null,
      link: link?.trim() || null,
      status: (status as JobStatus) || 'IN_PROGRESS',
      priority: (priority as JobPriority) || 'MEDIUM',
      comments: comments?.trim() || null,
      deadline: deadline ? new Date(deadline) : null,
      ...(pageNote ? { note: { create: { content: pageNote } } } : {}),
    },
    include: { category: { select: { id: true, name: true } }, note: true },
  })

  await prisma.jobHistory.create({
    data: { jobId: job.id, fieldChanged: 'status', oldValue: null, newValue: job.status },
  })

  return NextResponse.json(job, { status: 201 })
}
