import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-ext'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { callLlmWithSavedKey } from '@/lib/llm-server'

// Enrich a job posting with structured data using an LLM
// Supports both NextAuth session cookies AND Bearer token (used by Chrome extension)
export async function POST(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pageText } = await req.json()
  if (!pageText?.trim()) {
    return NextResponse.json({ error: 'pageText is required' }, { status: 400 })
  }

  const systemPrompt = `You are a job data extractor. Extract structured information from job postings.
Return a JSON object with: title, company, location, salary, requirements (array), responsibilities (array), type (Full-time/Part-time/Contract), remote (boolean).
Only output valid JSON, no other text.`

  const userPrompt = `Extract job data from this posting:\n\n${pageText.slice(0, 4000)}`

  const result = await callLlmWithSavedKey(user.id, systemPrompt, userPrompt, 1024)
  if (!result.ok) {
    return NextResponse.json({ error: `LLM error: ${result.error}` }, { status: 502 })
  }

  try {
    const parsed = JSON.parse(result.text)
    return NextResponse.json(parsed)
  } catch {
    // Try extracting JSON from markdown block
    const match = result.text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      try { return NextResponse.json(JSON.parse(match[1])) } catch { /* fall through */ }
    }
    return NextResponse.json({ raw: result.text })
  }
}
