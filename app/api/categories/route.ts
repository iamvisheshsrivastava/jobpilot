import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-ext'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { displayOrder: 'asc' },
  })

  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const existing = await prisma.category.findUnique({
    where: { userId_name: { userId: user.id, name: name.trim() } },
  })
  if (existing) return NextResponse.json({ error: 'Category already exists' }, { status: 409 })

  const maxOrder = await prisma.category.aggregate({
    where: { userId: user.id },
    _max: { displayOrder: true },
  })

  const category = await prisma.category.create({
    data: {
      userId: user.id,
      name: name.trim(),
      displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
    },
  })

  return NextResponse.json(category, { status: 201 })
}
