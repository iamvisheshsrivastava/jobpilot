import crypto from 'crypto'
import { auth } from './auth'

// Shared public demo account guard — see issues #9 and #18. Routes should use
// isDemoAccount() rather than declaring their own copy of the address.
export const DEMO_EMAIL = 'demo@jobpilot.app'
export function isDemoAccount(email?: string | null): boolean {
  return email === DEMO_EMAIL
}

// Validate required env vars at module load time — never silently use an empty key
if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  throw new Error('AUTH_SECRET env var is not set')
}

// Extension tokens use their own key when EXT_TOKEN_SECRET is set, so they don't
// share a signing key with NextAuth session tokens (issue #15).
export function getExtSecret(): string {
  return process.env.EXT_TOKEN_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET!
}
export const EXT_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

// Verify a Bearer token issued by /api/auth/token (for Chrome extension)
export async function verifyExtToken(token: string): Promise<{ id: string; email: string; name?: string | null } | null> {
  try {
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return null

    const secret = getExtSecret()
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
    const a = Buffer.from(expected)
    const b = Buffer.from(sig)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (data.typ !== 'ext' || typeof data.exp !== 'number' || data.exp < Date.now()) return null

    return { id: data.id, email: data.email, name: data.name }
  } catch {
    return null
  }
}

// Unified auth — works for both web session and extension Bearer token
export async function getUser(req: Request): Promise<{ id: string; email: string; name?: string | null } | null> {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return verifyExtToken(authHeader.slice(7))
  }
  const session = await auth()
  if (session?.user?.id) return { id: session.user.id, email: session.user.email!, name: session.user.name }
  return null
}
