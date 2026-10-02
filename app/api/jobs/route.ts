import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getUser, isDemoAccount } from '@/lib/auth-ext'
import { prisma } from '@/lib/prisma'
import { isValidStatus, isValidPriority, isSafeUrl, parsePositiveInt } from '@/lib/validation'

type JobStatus = string
type JobPriority = string


export async function GET(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId')
  const status = searchParams.get('status') as JobStatus | null
  const search = searchParams.get('search') || ''
  const page = parsePositiveInt(searchParams.get('page'), 1)
  const limit = parsePositiveInt(searchParams.get('limit'), 10, 100)

  if (status && !isValidStatus(status)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 })
  }

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
  if (isDemoAccount(user.email)) return NextResponse.json({ error: 'Demo account is read-only' }, { status: 403 })

  const body = await req.json()
  const { title, company, link, categoryId, status, priority, deadline, comments, pageNote } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!categoryId) return NextResponse.json({ error: 'Category is required' }, { status: 400 })
  if (status && !isValidStatus(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  if (priority && !isValidPriority(priority)) return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
  if (link?.trim() && !isSafeUrl(link.trim())) return NextResponse.json({ error: 'Link must be a valid http(s) URL' }, { status: 400 })

  const cat = await prisma.category.findFirst({ where: { id: categoryId, userId: user.id } })
  if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  // The max-read + create used to run as two separate statements, so two
  // concurrent requests could read the same max jobNumber and both insert
  // with the same value. Run them inside a single Serializable transaction
  // and retry on a Postgres serialization failure (Prisma P2034) so one of
  // the racing requests re-reads the up-to-date max instead of colliding.
  const MAX_ATTEMPTS = 5
  let job: Awaited<ReturnType<typeof prisma.job.create>> & {
    category: { id: string; name: string }
    note: { id: string; jobId: string; content: string; createdAt: Date; updatedAt: Date } | null
  }
  let lastError: unknown
  let attempt = 0
  for (; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      job = await prisma.$transaction(
        async (tx) => {
          const maxJob = await tx.job.aggregate({
            where: { category: { userId: user.id } },
            _max: { jobNumber: true },
          })
          const jobNumber = (maxJob._max.jobNumber ?? 0) + 1

          const created = await tx.job.create({
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

          await tx.jobHistory.create({
            data: { jobId: created.id, fieldChanged: 'status', oldValue: null, newValue: created.status },
          })

          return created
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      lastError = undefined
      break
    } catch (err) {
      lastError = err
      const isSerializationFailure =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034'
      if (!isSerializationFailure) throw err
      // retry: another concurrent request won the race, try again with a fresh read
    }
  }
  if (lastError) throw lastError

  return NextResponse.json(job!, { status: 201 })
}
