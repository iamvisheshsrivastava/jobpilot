import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-ext'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

// Check job suitability against the user's profile using an LLM
// Supports both NextAuth session cookies AND Bearer token (used by Chrome extension)
export async function POST(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pageText, userProfile } = await req.json()
  if (!pageText?.trim()) {
    return NextResponse.json({ error: 'pageText is required' }, { status: 400 })
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: { userId: user.id },
  })

  const groqRecord = apiKeys.find((k) => k.provider === 'GROQ')
  const orRecord = apiKeys.find((k) => k.provider === 'OPENROUTER')

  const groqKey = groqRecord ? decrypt(groqRecord.encryptedKey) : null
  const openRouterKey = orRecord ? decrypt(orRecord.encryptedKey) : null

  if (!groqKey && !openRouterKey) {
    return NextResponse.json(
      { error: 'No API keys configured. Please add your Groq or OpenRouter key in Settings.' },
      { status: 422 },
    )
  }

  const apiKey = groqKey || openRouterKey!
  const baseUrl = groqKey
    ? 'https://api.groq.com/openai/v1'
    : 'https://openrouter.ai/api/v1'
  const model = groqKey ? 'llama-3.3-70b-versatile' : 'mistralai/mistral-7b-instruct'

  const systemPrompt = `You are a career advisor and job fit analyzer. Given a user's profile and a job description, evaluate how suitable the candidate is.
Return a JSON object with: score (0-100), verdict (Excellent/Good/Fair/Poor), strengths (array of strings), gaps (array of strings), recommendation (1-2 sentence string).
Only output valid JSON, no other text.`

  const userPrompt = `USER PROFILE:\n${userProfile || 'No profile provided'}\n\nJOB DESCRIPTION:\n${pageText.slice(0, 3000)}`

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `LLM error: ${err}` }, { status: 502 })
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content || '{}'
    try {
      const parsed = JSON.parse(text)
      // Add `reason` field for Chrome extension backward compatibility
      // (popup.js reads resp.data?.reason)
      if (parsed.recommendation && !parsed.reason) {
        parsed.reason = parsed.recommendation
      }
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ raw: text })
    }
  } catch (err) {
    console.error('[suitability]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
}
