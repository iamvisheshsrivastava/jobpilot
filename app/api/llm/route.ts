import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-ext'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

// Provider → base URL map (for OpenAI-compatible APIs)
const OPENAI_COMPAT_URLS: Record<string, string> = {
  OpenAI: 'https://api.openai.com/v1',
  Groq: 'https://api.groq.com/openai/v1',
  OpenRouter: 'https://openrouter.ai/api/v1',
}

export async function POST(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { systemPrompt, userPrompt } = await req.json()
  if (!systemPrompt || !userPrompt) {
    return NextResponse.json({ error: 'systemPrompt and userPrompt are required' }, { status: 400 })
  }

  // Get the most recently updated API key
  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    take: 1,
  })

  if (!keys.length) {
    return NextResponse.json({ error: 'No API key configured. Please go to Settings → API Keys and add one.' }, { status: 400 })
  }

  const keyRecord = keys[0]
  let apiKey: string
  try {
    apiKey = decrypt(keyRecord.encryptedKey)
  } catch {
    return NextResponse.json({ error: 'Failed to decrypt API key.' }, { status: 500 })
  }

  const provider = keyRecord.provider
  // modelName is not stored in the new schema — use a sensible default per provider
  const modelDefaults: Record<string, string> = {
    GROQ: 'llama-3.3-70b-versatile',
    OPENROUTER: 'meta-llama/llama-3.1-8b-instruct:free',
    OpenAI: 'gpt-4o-mini',
    Anthropic: 'claude-3-5-haiku-20241022',
    Gemini: 'gemini-1.5-flash',
  }
  const model = modelDefaults[provider] ?? 'gpt-4o-mini'

  try {
    let text = ''

    if (provider === 'Anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      const data = await res.json()
      text = data.content?.[0]?.text ?? ''
    } else if (provider === 'Gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: 4096 },
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      const data = await res.json()
      text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    } else {
      // OpenAI-compatible (OpenAI, Groq, OpenRouter, or GROQ/OPENROUTER from DB)
      const baseUrl = OPENAI_COMPAT_URLS[provider] ?? OPENAI_COMPAT_URLS.OpenAI
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
      if (provider === 'OpenRouter' || provider === 'OPENROUTER') {
        headers['HTTP-Referer'] = 'https://jobpilot.app'
        headers['X-Title'] = 'JobPilot'
      }
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      const data = await res.json()
      text = data.choices?.[0]?.message?.content ?? ''
    }

    return NextResponse.json({ text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `LLM error (${provider}): ${msg}` }, { status: 500 })
  }
}
