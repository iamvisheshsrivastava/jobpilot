import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-ext'
import { prisma } from '@/lib/prisma'

type JobStatus = string
type JobPriority = string

const DEMO_EMAIL = 'demo@jobpilot.app'

async function getOwnedJob(userId: string, jobId: string) {
  return prisma.job.findFirst({
    where: { id: jobId, category: { userId } },
    include: { note: true },
  })
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const job = await getOwnedJob(user.id, params.id)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(job)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.email === DEMO_EMAIL) return NextResponse.json({ error: 'Demo account is read-only' }, { status: 403 })

  const job = await getOwnedJob(user.id, params.id)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { title, company, link, categoryId, status, priority, comments, deadline, pageNote, notes, resumeVersion, recruiterName, recruiterEmail, applicationNotes, resumeVersionId } = body

  if (categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: categoryId, userId: user.id } })
    if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  const historyEntries: { fieldChanged: string; oldValue: string | null; newValue: string }[] = []
  if (status && status !== job.status) historyEntries.push({ fieldChanged: 'status', oldValue: job.status, newValue: status })
  if (priority && priority !== job.priority) historyEntries.push({ fieldChanged: 'priority', oldValue: job.priority, newValue: priority })
  if (categoryId && categoryId !== job.categoryId) historyEntries.push({ fieldChanged: 'categoryId', oldValue: job.categoryId, newValue: categoryId })

  const data: Record<string, unknown> = {}
  if (title?.trim()) data.title = title.trim()
  if (company !== undefined) data.company = company?.trim() || null
  if (link !== undefined) data.link = link?.trim() || null
  if (categoryId) data.categoryId = categoryId
  if (status) data.status = status as JobStatus
  if (priority) data.priority = priority as JobPriority
  if (comments !== undefined) data.comments = comments?.trim() || null
  if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null
  if (recruiterName !== undefined) data.recruiterName = recruiterName?.trim() || null
  if (recruiterEmail !== undefined) data.recruiterEmail = recruiterEmail?.trim() || null
  if (resumeVersion !== undefined) data.resumeUsed = resumeVersion?.trim() || null
  if (applicationNotes !== undefined) data.applicationNotes = applicationNotes?.trim() || null
  if (notes !== undefined) data.notes = notes?.trim() || null
  if (resumeVersionId !== undefined) data.resumeVersionId = resumeVersionId || null

  const updated = await prisma.$transaction(async (tx) => {
    const updatedJob = await tx.job.update({
      where: { id: params.id },
      data,
      include: { category: { select: { id: true, name: true } }, note: true },
    })
    if (historyEntries.length > 0) {
      await tx.jobHistory.createMany({ data: historyEntries.map((e) => ({ jobId: params.id, ...e })) })
    }
    if (pageNote !== undefined) {
      await tx.jobNote.upsert({
        where: { jobId: params.id },
        create: { jobId: params.id, content: pageNote },
        update: { content: pageNote },
      })
    }
    return updatedJob
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.email === DEMO_EMAIL) return NextResponse.json({ error: 'Demo account is read-only' }, { status: 403 })

  const job = await getOwnedJob(user.id, params.id)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.job.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
