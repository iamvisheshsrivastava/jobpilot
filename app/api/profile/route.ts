import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-ext'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } })
  return NextResponse.json(profile ?? { userId: user.id })
}

export async function PATCH(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.summary !== undefined) data.summary = body.summary
  if (body.cvText !== undefined) data.cvText = body.cvText
  if (body.experience !== undefined) data.experience = JSON.stringify(body.experience)
  if (body.education !== undefined) data.education = JSON.stringify(body.education)
  if (body.skills !== undefined) data.skills = JSON.stringify(body.skills)
  if (body.languages !== undefined) data.languages = JSON.stringify(body.languages)
  if (body.certifications !== undefined) data.certifications = JSON.stringify(body.certifications)
  const profile = await prisma.userProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  })
  return NextResponse.json(profile)
}
