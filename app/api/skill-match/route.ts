import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

// Provider → base URL map (for OpenAI-compatible APIs)
const OPENAI_COMPAT_URLS: Record<string, string> = {
  OpenAI: 'https://api.openai.com/v1',
  Groq: 'https://api.groq.com/openai/v1',
  OpenRouter: 'https://openrouter.ai/api/v1',
}

// Model defaults per provider
const MODEL_DEFAULTS: Record<string, string> = {
  GROQ: 'llama-3.3-70b-versatile',
  OPENROUTER: 'meta-llama/llama-3.1-8b-instruct:free',
  OPENAI: 'gpt-4o-mini',
  ANTHROPIC: 'claude-3-5-haiku-20241022',
  GEMINI: 'gemini-1.5-flash',
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { jobDescription } = await req.json()
  if (!jobDescription?.trim()) {
    return NextResponse.json({ error: 'jobDescription is required' }, { status: 400 })
  }

  // Fetch user profile from DB
  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  })

  // Parse user's skills — could be JSON array or comma-separated string
  let userSkills: string[] = []
  if (profile?.skills) {
    try {
      const parsed = JSON.parse(profile.skills)
      if (Array.isArray(parsed)) {
        userSkills = parsed.map((s: string) => s.trim().toLowerCase())
      }
    } catch {
      // Fallback: treat as comma-separated
      userSkills = profile.skills.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
    }
  }

  // Fetch the most recently updated API key
  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    take: 1,
    select: { id: true, provider: true, encryptedKey: true, modelName: true },
  })

  if (!keys.length) {
    return NextResponse.json(
      { error: 'No API key configured. Please add one in Settings.' },
      { status: 422 },
    )
  }

  const keyRecord = keys[0]
  let apiKey: string
  try {
    apiKey = decrypt(keyRecord.encryptedKey)
  } catch {
    return NextResponse.json({ error: 'Failed to decrypt API key.' }, { status: 500 })
  }

  const provider = keyRecord.provider
  const DEPRECATED_MODELS: Record<string, string> = {
    'mistralai/mistral-7b-instruct': 'meta-llama/llama-3.1-8b-instruct:free',
    'mistralai/mistral-7b-instruct:free': 'meta-llama/llama-3.1-8b-instruct:free',
    'openrouter:free': 'meta-llama/llama-3.1-8b-instruct:free',
    'custom': 'meta-llama/llama-3.1-8b-instruct:free',
  }
  const savedModel = keyRecord.modelName ?? MODEL_DEFAULTS[provider.toUpperCase()] ?? 'gpt-4o-mini'
  const model = DEPRECATED_MODELS[savedModel] ?? savedModel

  const systemPrompt = `You are a skill extraction assistant. Extract the required technical skills from the job description provided. Return ONLY a JSON object in this exact format, no explanation or other text:
{
  "required_skills": ["Python", "SQL", "AWS", "Docker"],
  "nice_to_have": ["Kubernetes", "Airflow"]
}

Include programming languages, frameworks, tools, platforms, and technologies. Exclude soft skills and general qualifications.`

  const userPrompt = `Job Description:\n${jobDescription.slice(0, 4000)}`

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
          max_tokens: 1024,
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
          generationConfig: { maxOutputTokens: 1024 },
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      const data = await res.json()
      text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    } else {
      // OpenAI-compatible
      const baseUrl = OPENAI_COMPAT_URLS[provider] ?? OPENAI_COMPAT_URLS.OpenAI
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
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
          max_tokens: 1024,
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

    // Parse JSON from LLM response
    let parsed: { required_skills?: string[]; nice_to_have?: string[] } = {}
    try {
      // Try direct parse first
      parsed = JSON.parse(text)
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1])
      } else {
        return NextResponse.json({ error: 'Failed to parse LLM response' }, { status: 502 })
      }
    }

    const requiredSkills = (parsed.required_skills ?? []).map((s) => s.trim())
    const niceToHaveSkills = (parsed.nice_to_have ?? []).map((s) => s.trim())

    // Cross-reference with user's skills (case-insensitive)
    const matched = requiredSkills.filter((skill) =>
      userSkills.includes(skill.toLowerCase()),
    )
    const missing = requiredSkills.filter(
      (skill) => !userSkills.includes(skill.toLowerCase()),
    )
    const matchedNice = niceToHaveSkills.filter((skill) =>
      userSkills.includes(skill.toLowerCase()),
    )

    return NextResponse.json({
      matched,
      missing,
      niceToHave: niceToHaveSkills,
      matchedNice,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Skill match error (${provider}): ${msg}` }, { status: 500 })
  }
}