import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-ext'
import { prisma } from '@/lib/prisma'

type JobStatus = string
type JobPriority = string

const DEMO_EMAIL = 'demo@jobpilot.app'

// Normalize UI display names → DB values (also pass DB values through unchanged)
const STATUS_NORMALIZE: Record<string, string> = {
  'In Progress': 'IN_PROGRESS',
  'Applied': 'APPLIED',
  'Interview': 'INTERVIEW',
  'Offer': 'OFFER',
  'Look Again': 'LOOK_AGAIN',
  'Rejected': 'REJECTED',
  'Not Suitable': 'NOT_SUITABLE',
  'Expired/Filled': 'EXPIRED_FILLED',
}
const PRIORITY_NORMALIZE: Record<string, string> = {
  'Super High': 'SUPER_HIGH',
  'High': 'HIGH',
  'Medium': 'MEDIUM',
  'Low': 'LOW',
}
function normalizeStatus(v: string): string { return STATUS_NORMALIZE[v] ?? v }
function normalizePriority(v: string): string { return PRIORITY_NORMALIZE[v] ?? v }

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
  const { title, company, link, categoryId, status, priority, comments, deadline, pageNote, notes, resumeVersion, recruiterName, recruiterEmail, recruiterLinkedIn, applicationNotes, resumeVersionId, starred } = body

  if (categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: categoryId, userId: user.id } })
    if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  const dbStatus = status ? normalizeStatus(status) : undefined
  const dbPriority = priority ? normalizePriority(priority) : undefined

  const historyEntries: { fieldChanged: string; oldValue: string | null; newValue: string }[] = []
  if (dbStatus && dbStatus !== job.status) historyEntries.push({ fieldChanged: 'status', oldValue: job.status, newValue: dbStatus })
  if (dbPriority && dbPriority !== job.priority) historyEntries.push({ fieldChanged: 'priority', oldValue: job.priority, newValue: dbPriority })
  if (categoryId && categoryId !== job.categoryId) historyEntries.push({ fieldChanged: 'categoryId', oldValue: job.categoryId, newValue: categoryId })

  const data: Record<string, unknown> = {}
  if (title?.trim()) data.title = title.trim()
  if (company !== undefined) data.company = company?.trim() || null
  if (link !== undefined) data.link = link?.trim() || null
  if (categoryId) data.categoryId = categoryId
  if (dbStatus) data.status = dbStatus as JobStatus
  if (dbPriority) data.priority = dbPriority as JobPriority
  if (comments !== undefined) data.comments = comments?.trim() || null
  if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null
  if (recruiterName !== undefined) data.recruiterName = recruiterName?.trim() || null
  if (recruiterEmail !== undefined) data.recruiterEmail = recruiterEmail?.trim() || null
  if (recruiterLinkedIn !== undefined) data.recruiterLinkedIn = recruiterLinkedIn?.trim() || null
  if (resumeVersion !== undefined) data.resumeUsed = resumeVersion?.trim() || null
  if (applicationNotes !== undefined) data.applicationNotes = applicationNotes?.trim() || null
  // notes is NOT a Job column (belongs to JobNote via pageNote/upsert); do not write to data.notes
  if (resumeVersionId !== undefined) data.resumeVersionId = resumeVersionId || null
  if (starred !== undefined) data.starred = Boolean(starred)

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
