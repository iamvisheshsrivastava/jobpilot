import { NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { auth } from '@/lib/auth'
import { r2Client, R2_BUCKET } from '@/lib/r2'

// GET /api/upload/sign?key=resumes/<userId>/... — returns a fresh signed URL (1h)
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  if (!key || !key.startsWith(`resumes/${session.user.id}/`)) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  }

  const signedUrl = await getSignedUrl(
    r2Client,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    { expiresIn: 3600 }, // 1 hour
  )

  return NextResponse.json({ signedUrl })
}
