import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = await prisma.apiKey.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.apiKey.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
