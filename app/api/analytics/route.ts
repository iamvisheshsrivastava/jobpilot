import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDateStr(raw: any): string {
  if (!raw) return new Date().toISOString()
  if (typeof raw === 'string') return raw
  if (raw instanceof Date) return raw.toISOString()
  return new Date().toISOString()
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // Fetch all jobs for this user
  const jobs = await prisma.job.findMany({
    where: { category: { userId } },
    include: { category: { select: { name: true } }, note: true },
    orderBy: { dateAdded: 'asc' },
  })

  // ── Totals ──────────────────────────────────────────────────────────────
  const totalApplied = jobs.filter((j) =>
    ['APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED'].includes(j.status),
  ).length
  const totalInterviews = jobs.filter((j) => j.status === 'INTERVIEW').length
  const totalOffers = jobs.filter((j) => j.status === 'OFFER').length
  const totalRejected = jobs.filter((j) => ['REJECTED', 'NOT_SUITABLE', 'EXPIRED_FILLED'].includes(j.status)).length
  const totalSaved = jobs.filter((j) => ['IN_PROGRESS', 'LOOK_AGAIN'].includes(j.status)).length
  const interviewRate = totalApplied > 0 ? parseFloat(((totalInterviews / totalApplied) * 100).toFixed(1)) : 0

  // ── byResume ────────────────────────────────────────────────────────────
  const resumeVersions = await prisma.resumeVersion.findMany({
    where: { userId },
    select: { id: true, name: true },
  })
  const resumeMap = new Map(resumeVersions.map((r) => [r.id, r.name]))

  // Group jobs by resumeVersionId
  const resumeGroups = new Map<string, { applications: number; interviews: number }>()
  for (const job of jobs) {
    const rvId = job.resumeVersionId || '__none__'
    if (!resumeGroups.has(rvId)) {
      resumeGroups.set(rvId, { applications: 0, interviews: 0 })
    }
    const g = resumeGroups.get(rvId)!
    if (['APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED'].includes(job.status)) g.applications++
    if (job.status === 'INTERVIEW') g.interviews++
  }

  const byResume = Array.from(resumeGroups.entries())
    .map(([rvId, counts]) => ({
      resumeName: rvId === '__none__' ? 'No resume tagged' : (resumeMap.get(rvId) ?? 'Unknown'),
      applications: counts.applications,
      interviews: counts.interviews,
      interviewRate: counts.applications > 0
        ? parseFloat(((counts.interviews / counts.applications) * 100).toFixed(1))
        : 0,
    }))
    .sort((a, b) => b.interviewRate - a.interviewRate)

  // ── byMonth ─────────────────────────────────────────────────────────────
  const monthGroups = new Map<string, { applied: number; interviews: number }>()
  for (const job of jobs) {
    const rawDate = job.dateAdded ?? job.createdAt
    const mk = rawDate.toISOString().slice(0, 7) // "YYYY-MM"
    if (!monthGroups.has(mk)) {
      monthGroups.set(mk, { applied: 0, interviews: 0 })
    }
    const g = monthGroups.get(mk)!
    if (['APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED'].includes(job.status)) g.applied++
    if (job.status === 'INTERVIEW') g.interviews++
  }

  const byMonth = Array.from(monthGroups.entries())
    .map(([key, counts]) => {
      const d = new Date(`${key}-01T00:00:00`)
      const month = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
      return { month, applied: counts.applied, interviews: counts.interviews }
    })

  // ── topCompanies ────────────────────────────────────────────────────────
  const companyGroups = new Map<string, { applications: number; status: string }>()
  for (const job of jobs) {
    const company = job.company?.trim()
    if (!company) continue
    if (!companyGroups.has(company)) {
      companyGroups.set(company, { applications: 0, status: job.status })
    }
    const g = companyGroups.get(company)!
    g.applications++
  }

  const topCompanies = Array.from(companyGroups.entries())
    .map(([company, data]) => ({
      company,
      applications: data.applications,
      status: data.status,
    }))
    .sort((a, b) => b.applications - a.applications)
    .slice(0, 20)

  return NextResponse.json({
    totals: {
      applied: totalApplied,
      interviews: totalInterviews,
      offers: totalOffers,
      rejected: totalRejected,
      saved: totalSaved,
      interviewRate,
    },
    byResume,
    byMonth,
    topCompanies,
  })
}