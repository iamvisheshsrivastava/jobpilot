import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-ext'
import { callLlmWithSavedKey } from '@/lib/llm-server'

export async function POST(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { systemPrompt, userPrompt } = await req.json()
  if (!systemPrompt || !userPrompt) {
    return NextResponse.json({ error: 'systemPrompt and userPrompt are required' }, { status: 400 })
  }

  const result = await callLlmWithSavedKey(user.id, systemPrompt, userPrompt, 4096)
  if (!result.ok) {
    return NextResponse.json({ error: `LLM error: ${result.error}` }, { status: 502 })
  }

  return NextResponse.json({ text: result.text })
}
