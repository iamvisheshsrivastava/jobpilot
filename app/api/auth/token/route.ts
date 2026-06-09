import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
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
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    })).toString('base64url')

    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ''
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
    const token = `${payload}.${sig}`

    return NextResponse.json({ token, email: user.email, name: user.name })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
