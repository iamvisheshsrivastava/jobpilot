/**
 * Server-side LLM helper.
 * Loads the user's saved API key + model from the DB and calls the provider.
 * All server routes should use this instead of hardcoding models/providers.
 */
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

type LLMResult = { ok: true; text: string } | { ok: false; error: string }

const PROVIDER_URLS: Record<string, string> = {
  OPENAI:     'https://api.openai.com/v1',
  GROQ:       'https://api.groq.com/openai/v1',
  OPENROUTER: 'https://openrouter.ai/api/v1',
}

/** Models confirmed working on OpenRouter's free tier (June 2026) */
const FREE_MODEL_FALLBACK = 'meta-llama/llama-3.3-70b-instruct:free'

const MODEL_DEFAULTS: Record<string, string> = {
  GROQ:       'llama-3.3-70b-versatile',
  OPENROUTER: FREE_MODEL_FALLBACK,
  OPENAI:     'gpt-4o-mini',
  ANTHROPIC:  'claude-3-5-haiku-20241022',
  GEMINI:     'gemini-2.0-flash',
}

/** Models that are known broken/unavailable → remap to a working one */
const BROKEN_MODELS: Record<string, string> = {
  'mistralai/mistral-7b-instruct':       FREE_MODEL_FALLBACK,
  'mistralai/mistral-7b-instruct:free':  FREE_MODEL_FALLBACK,
  'meta-llama/llama-3.1-8b-instruct:free': FREE_MODEL_FALLBACK,
  'meta-llama/llama-3.1-8b-instruct':   FREE_MODEL_FALLBACK,
  'openrouter:free':                     FREE_MODEL_FALLBACK,
  'custom':                              FREE_MODEL_FALLBACK,
  'openai/gpt-3.5-turbo':               FREE_MODEL_FALLBACK,
}

function resolveModel(savedModel: string | null, providerKey: string): string {
  const raw = savedModel ?? MODEL_DEFAULTS[providerKey] ?? 'gpt-4o-mini'
  return BROKEN_MODELS[raw] ?? raw
}

export async function callLlmWithSavedKey(
  userId: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048,
): Promise<LLMResult> {
  // Load most-recently-updated API key for this user
  const keys = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 1,
    select: { provider: true, encryptedKey: true, modelName: true },
  })

  if (!keys.length) {
    return { ok: false, error: 'No API key configured. Please add one in Settings → API Keys.' }
  }

  const keyRecord = keys[0]
  let apiKey: string
  try {
    apiKey = decrypt(keyRecord.encryptedKey)
  } catch {
    return { ok: false, error: 'Failed to decrypt API key.' }
  }

  const provider = keyRecord.provider
  const providerKey = provider.toUpperCase()
  const model = resolveModel(keyRecord.modelName ?? null, providerKey)

  try {
    let text = ''

    if (providerKey === 'ANTHROPIC') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` }
      const data = await res.json()
      text = data.content?.[0]?.text ?? ''

    } else if (providerKey === 'GEMINI') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      })
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` }
      const data = await res.json()
      text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    } else {
      // OpenAI-compatible (OpenAI, Groq, OpenRouter)
      const baseUrl = PROVIDER_URLS[providerKey] ?? PROVIDER_URLS.OPENAI
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
      if (providerKey === 'OPENROUTER') {
        headers['HTTP-Referer'] = 'https://jobpilot.app'
        headers['X-Title'] = 'JobPilot'
      }

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      })

      if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` }
      const data = await res.json()
      text = data.choices?.[0]?.message?.content ?? ''
    }

    return { ok: true, text }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
