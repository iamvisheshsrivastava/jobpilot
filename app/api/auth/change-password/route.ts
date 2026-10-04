import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isDemoAccount } from '@/lib/auth-ext'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// 10 attempts per 15 minutes per IP — see lib/rate-limit.ts for caveats.
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 15 * 60 * 1000

// POST /api/auth/change-password - requires an active web session (not an
// extension Bearer token, since the whole point is to revoke those).
// Bumps tokenVersion so every previously-issued extension token is
// invalidated immediately (issue #15) - see verifyExtToken in lib/auth-ext.ts.
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (isDemoAccount(session.user.email)) {
      return NextResponse.json({ error: 'Demo account is read-only' }, { status: 403 })
    }

    const ip = getClientIp(req)
    const { allowed, retryAfterSeconds } = checkRateLimit(`change-password:${session.user.id}:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
      )
    }

    const body = await req.json().catch(() => null)
    const currentPassword = body?.currentPassword
    const newPassword = body?.newPassword
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }
    if (Buffer.byteLength(newPassword) > 72) {
      return NextResponse.json({ error: 'New password must be at most 72 bytes' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })

    const passwordHash = await bcrypt.hash(newPassword, 12)

    // Bump tokenVersion in the same write so every outstanding extension
    // token (signed with the old version) stops verifying immediately.
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[auth/change-password]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
