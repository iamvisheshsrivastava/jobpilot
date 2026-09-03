import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { checkRateLimit, getClientIp } from './rate-limit'

// 10 attempts per 15 minutes per IP — see lib/rate-limit.ts for caveats.
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 15 * 60 * 1000

export const { handlers, signIn, signOut, auth } = NextAuth({
  // PrismaAdapter is incompatible with JWT strategy — we use JWT only
  // Credentials provider requires JWT, not database sessions
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null

        const ip = getClientIp(request)
        const { allowed } = checkRateLimit(`login:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)
        if (!allowed) return null

        const normalizedEmail = (credentials.email as string).toLowerCase().trim()

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        })

        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        )
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id as string
      return session
    },
  },
})
