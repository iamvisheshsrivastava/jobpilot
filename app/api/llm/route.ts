import { NextResponse } from 'next/server'
import { getUser, isDemoAccount } from '@/lib/auth-ext'
import { callLlmWithSavedKey } from '@/lib/llm-server'

export async function POST(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Defense in depth: this route runs under the caller's own saved API key,
  // so it's only a cost/abuse concern if a shared key is ever added to the
  // demo account — guard anyway since that's a cheap, easy-to-forget trap.
  if (isDemoAccount(user.email)) return NextResponse.json({ error: 'Demo account is read-only' }, { status: 403 })

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
