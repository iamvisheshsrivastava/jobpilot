import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getOwnedCategory(userId: string, id: string) {
  return prisma.category.findFirst({ where: { id, userId } })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const category = await getOwnedCategory(session.user.id, params.id)
  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const data: { name?: string; displayOrder?: number } = {}
  if (body.name?.trim()) data.name = body.name.trim()
  if (typeof body.displayOrder === 'number') data.displayOrder = body.displayOrder

  const updated = await prisma.category.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const category = await getOwnedCategory(session.user.id, params.id)
  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const total = await prisma.category.count({ where: { userId: session.user.id } })
  if (total <= 1) {
    return NextResponse.json({ error: 'Cannot delete your only category' }, { status: 400 })
  }

  const jobCount = await prisma.job.count({ where: { categoryId: params.id } })
  if (jobCount > 0) {
    return NextResponse.json(
      { error: `Move or delete the ${jobCount} job(s) in this category first` },
      { status: 409 },
    )
  }

  await prisma.category.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
