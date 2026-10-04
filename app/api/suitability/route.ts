import { NextResponse } from 'next/server'
import { getUser, isDemoAccount } from '@/lib/auth-ext'
import { callLlmWithSavedKey } from '@/lib/llm-server'
import { prisma } from '@/lib/prisma'

// Check job suitability against the user's profile using an LLM
// Supports both NextAuth session cookies AND Bearer token (used by Chrome extension)
export async function POST(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Defense in depth: cost/abuse concern only if a shared key is ever added
  // to the demo account, but cheap to guard.
  if (isDemoAccount(user.email)) return NextResponse.json({ error: 'Demo account is read-only' }, { status: 403 })

  const { pageText, userProfile, jobId } = await req.json()
  if (!pageText?.trim()) {
    return NextResponse.json({ error: 'pageText is required' }, { status: 400 })
  }

  // Optional: if the caller passes a jobId (e.g. "Check AI Match" from the
  // job detail drawer), verify it belongs to this user before we persist
  // anything against it.
  let ownedJobId: string | null = null
  if (typeof jobId === 'string' && jobId) {
    const job = await prisma.job.findFirst({ where: { id: jobId, category: { userId: user.id } }, select: { id: true } })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    ownedJobId = job.id
  }

  const systemPrompt = `You are a career advisor and job fit analyzer. Given a user's profile and a job description, evaluate how suitable the candidate is.
Return a JSON object with: score (0-100), verdict (Excellent/Good/Fair/Poor), strengths (array of strings), gaps (array of strings), recommendation (1-2 sentence string).
Only output valid JSON, no other text.`

  const userPrompt = `USER PROFILE:\n${userProfile || 'No profile provided'}\n\nJOB DESCRIPTION:\n${pageText.slice(0, 3000)}`

  const result = await callLlmWithSavedKey(user.id, systemPrompt, userPrompt, 1024)
  if (!result.ok) {
    return NextResponse.json({ error: `LLM error: ${result.error}` }, { status: 502 })
  }

  async function persistScore(parsed: Record<string, unknown>) {
    if (!ownedJobId) return
    const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : null
    if (score === null) return
    const verdict = typeof parsed.verdict === 'string' ? parsed.verdict.slice(0, 50) : null
    try {
      await prisma.job.update({
        where: { id: ownedJobId },
        data: { matchScore: score, matchVerdict: verdict, matchedAt: new Date() },
      })
    } catch {
      // Persisting the score is a nice-to-have - don't fail the request
      // (which the user is actively waiting on) just because the save failed.
    }
  }

  try {
    const parsed = JSON.parse(result.text)
    // Add `reason` field for Chrome extension backward compatibility
    if (parsed.recommendation && !parsed.reason) parsed.reason = parsed.recommendation
    await persistScore(parsed)
    return NextResponse.json(parsed)
  } catch {
    const match = result.text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      try {
        const parsed = JSON.parse(match[1])
        if (parsed.recommendation && !parsed.reason) parsed.reason = parsed.recommendation
        await persistScore(parsed)
        return NextResponse.json(parsed)
      } catch { /* fall through */ }
    }
    return NextResponse.json({ raw: result.text })
  }
}
