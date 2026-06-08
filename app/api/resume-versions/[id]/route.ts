import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const version = await prisma.resumeVersion.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!version) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { name, notes, fileUrl } = await req.json()

  const updated = await prisma.resumeVersion.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      ...(fileUrl !== undefined ? { fileUrl: fileUrl?.trim() || null } : {}),
    },
  })

  const applications = await prisma.job.count({
    where: { resumeVersionId: params.id },
  })
  const interviews = await prisma.job.count({
    where: { resumeVersionId: params.id, status: 'INTERVIEW' },
  })

  return NextResponse.json({
    id: updated.id,
    userId: updated.userId,
    name: updated.name,
    fileUrl: updated.fileUrl,
    notes: updated.notes,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    applications,
    interviews,
  })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const version = await prisma.resumeVersion.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!version) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Nullify resumeVersionId on all linked jobs before deleting
  await prisma.job.updateMany({
    where: { resumeVersionId: params.id },
    data: { resumeVersionId: null },
  })

  await prisma.resumeVersion.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}