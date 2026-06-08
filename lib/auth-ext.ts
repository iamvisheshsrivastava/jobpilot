import crypto from 'crypto'
import { auth } from './auth'

// Validate required env vars at module load time — never silently use an empty key
if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  throw new Error('AUTH_SECRET env var is not set')
}

// Verify a Bearer token issued by /api/auth/token (for Chrome extension)
export async function verifyExtToken(token: string): Promise<{ id: string; email: string; name?: string | null } | null> {
  try {
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return null

    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET!
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
    if (expected !== sig) return null

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (data.exp < Date.now()) return null

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
