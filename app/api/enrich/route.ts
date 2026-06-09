import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-ext'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

// Enrich a job posting with structured data using an LLM
// Supports both NextAuth session cookies AND Bearer token (used by Chrome extension)
export async function POST(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pageText } = await req.json()
  if (!pageText?.trim()) {
    return NextResponse.json({ error: 'pageText is required' }, { status: 400 })
  }

  // Fetch user's API keys
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

  const systemPrompt = `You are a job data extractor. Extract structured information from job postings.
Return a JSON object with: title, company, location, salary, requirements (array), responsibilities (array), type (Full-time/Part-time/Contract), remote (boolean).
Only output valid JSON, no other text.`

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
          { role: 'user', content: `Extract job data from this posting:\n\n${pageText.slice(0, 4000)}` },
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
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ raw: text })
    }
  } catch (err) {
    console.error('[enrich]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
}
