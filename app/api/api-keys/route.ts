import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, maskKey } from '@/lib/crypto'

const VALID_PROVIDERS = ['GROQ', 'OPENROUTER', 'OPENAI', 'ANTHROPIC', 'GEMINI'] as const

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    select: { id: true, provider: true, modelName: true, encryptedKey: true, updatedAt: true },
  })

  // Return masked keys — never the raw encrypted value
  const masked = keys.map((k) => ({
    id: k.id,
    provider: k.provider,
    modelName: k.modelName,
    maskedKey: maskKey(k.encryptedKey.split(':')[2] || '****'),
    updatedAt: k.updatedAt,
  }))

  return NextResponse.json(masked)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { key, modelName } = body
  // Accept mixed-case provider names (e.g. "OpenRouter") — normalise to uppercase
  const provider = typeof body.provider === 'string' ? body.provider.toUpperCase().replace(/\s/g, '') : ''

  if (!provider || !key?.trim()) {
    return NextResponse.json({ error: 'Provider and key are required' }, { status: 400 })
  }

  if (!VALID_PROVIDERS.includes(provider as typeof VALID_PROVIDERS[number])) {
    return NextResponse.json({ error: 'Invalid provider. Use GROQ, OPENROUTER, OPENAI, ANTHROPIC, or GEMINI' }, { status: 400 })
  }

  const encryptedKey = encrypt(key.trim())

  const saved = await prisma.apiKey.upsert({
    where: { userId_provider: { userId: session.user.id, provider } },
    create: { userId: session.user.id, provider, encryptedKey, modelName: modelName || null },
    update: { encryptedKey, modelName: modelName || null },
    select: { id: true, provider: true, modelName: true, updatedAt: true },
  })

  return NextResponse.json(saved, { status: 201 })
}