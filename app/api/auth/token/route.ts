import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getExtSecret, EXT_TOKEN_TTL_MS } from '@/lib/auth-ext'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// 10 attempts per 15 minutes per IP — see lib/rate-limit.ts for caveats.
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 15 * 60 * 1000

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { allowed, retryAfterSeconds } = checkRateLimit(`auth-token:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
      )
    }

    const body = await req.json().catch(() => null)
    const email = body?.email
    const password = body?.password
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    if (email.length > 254 || Buffer.byteLength(password) > 72) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    // Case-insensitive lookup covers accounts registered before email normalisation was enforced
    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    })
    if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

    // Simple signed token: base64(payload).base64(hmac)
    const payload = Buffer.from(JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      typ: 'ext',
      exp: Date.now() + EXT_TOKEN_TTL_MS,
    })).toString('base64url')

    const secret = getExtSecret()
    if (!secret) {
      console.error('[auth/token] AUTH_SECRET/NEXTAUTH_SECRET is not set')
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
    const token = `${payload}.${sig}`

    return NextResponse.json({ token, email: user.email, name: user.name })
  } catch (err) {
    console.error('[auth/token]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
