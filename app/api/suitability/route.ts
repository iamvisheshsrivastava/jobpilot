import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-ext'
import { callLlmWithSavedKey } from '@/lib/llm-server'

// Check job suitability against the user's profile using an LLM
// Supports both NextAuth session cookies AND Bearer token (used by Chrome extension)
export async function POST(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pageText, userProfile } = await req.json()
  if (!pageText?.trim()) {
    return NextResponse.json({ error: 'pageText is required' }, { status: 400 })
  }

  const systemPrompt = `You are a career advisor and job fit analyzer. Given a user's profile and a job description, evaluate how suitable the candidate is.
Return a JSON object with: score (0-100), verdict (Excellent/Good/Fair/Poor), strengths (array of strings), gaps (array of strings), recommendation (1-2 sentence string).
Only output valid JSON, no other text.`

  const userPrompt = `USER PROFILE:\n${userProfile || 'No profile provided'}\n\nJOB DESCRIPTION:\n${pageText.slice(0, 3000)}`

  const result = await callLlmWithSavedKey(user.id, systemPrompt, userPrompt, 1024)
  if (!result.ok) {
    return NextResponse.json({ error: `LLM error: ${result.error}` }, { status: 502 })
  }

  try {
    const parsed = JSON.parse(result.text)
    // Add `reason` field for Chrome extension backward compatibility
    if (parsed.recommendation && !parsed.reason) parsed.reason = parsed.recommendation
    return NextResponse.json(parsed)
  } catch {
    const match = result.text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      try {
        const parsed = JSON.parse(match[1])
        if (parsed.recommendation && !parsed.reason) parsed.reason = parsed.recommendation
        return NextResponse.json(parsed)
      } catch { /* fall through */ }
    }
    return NextResponse.json({ raw: result.text })
  }
}
