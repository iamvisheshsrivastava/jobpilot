import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-ext'
import { prisma } from '@/lib/prisma'

const DEMO_EMAIL = 'demo@jobpilot.app'

async function getOwnedCategory(userId: string, id: string) {
  return prisma.category.findFirst({ where: { id, userId } })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.email === DEMO_EMAIL) return NextResponse.json({ error: 'Demo account is read-only' }, { status: 403 })

  const category = await getOwnedCategory(user.id, params.id)
  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const data: { name?: string; displayOrder?: number } = {}
  if (body.name?.trim()) data.name = body.name.trim()
  if (typeof body.displayOrder === 'number') data.displayOrder = body.displayOrder

  const updated = await prisma.category.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.email === DEMO_EMAIL) return NextResponse.json({ error: 'Demo account is read-only' }, { status: 403 })

  const category = await getOwnedCategory(user.id, params.id)
  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const total = await prisma.category.count({ where: { userId: user.id } })
  if (total <= 1) return NextResponse.json({ error: 'Cannot delete your only category' }, { status: 400 })

  const jobCount = await prisma.job.count({ where: { categoryId: params.id } })
  if (jobCount > 0) {
    return NextResponse.json({ error: `Move or delete the ${jobCount} job(s) in this category first` }, { status: 409 })
  }

  await prisma.category.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
