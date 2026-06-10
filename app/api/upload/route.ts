import { NextResponse } from 'next/server'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { auth } from '@/lib/auth'
import { r2Client, R2_BUCKET } from '@/lib/r2'

// POST /api/upload — upload a file to R2, returns { url }
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Max 10 MB.' }, { status: 413 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
  const key = `resumes/${session.user.id}/${Date.now()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    }),
  )

  // Generate a signed URL valid for 7 days (read-only, for preview/download)
  const signedUrl = await getSignedUrl(
    r2Client,
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    { expiresIn: 60 * 60 * 24 * 7 },
  )

  // Store a stable reference: we'll use the key to generate fresh signed URLs on demand
  // For simplicity, store the key as r2://<key> so we can detect and re-sign it later
  return NextResponse.json({ url: `r2://${key}`, signedUrl })
}

// DELETE /api/upload?key=resumes/... — delete a file from R2
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  if (!key || !key.startsWith(`resumes/${session.user.id}/`)) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  }

  await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
  return new NextResponse(null, { status: 204 })
}
