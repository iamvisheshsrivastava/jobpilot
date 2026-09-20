import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// 10 attempts per 15 minutes per IP — see lib/rate-limit.ts for caveats.
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 15 * 60 * 1000

// RFC-5322-ish "good enough" email check — not exhaustive, just enough to
// reject obviously malformed input before it hits the DB.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const { allowed, retryAfterSeconds } = checkRateLimit(`register:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
      )
    }

    const body = await req.json().catch(() => null)
    const { email, password, name } = body ?? {}

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (name != null && (typeof name !== 'string' || name.length > 100)) {
      return NextResponse.json({ error: 'Name must be a string of at most 100 characters' }, { status: 400 })
    }

    if (email.length > 254 || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    if (Buffer.byteLength(password) > 72) {
      return NextResponse.json({ error: 'Password must be at most 72 bytes' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash, name: name || null },
      select: { id: true, email: true, name: true },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
