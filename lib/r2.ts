import { S3Client } from '@aws-sdk/client-s3'

if (
  !process.env.R2_ACCESS_KEY_ID ||
  !process.env.R2_SECRET_ACCESS_KEY ||
  !process.env.R2_ENDPOINT ||
  !process.env.R2_BUCKET_NAME
) {
  // Only warn — don't throw at import time (breaks build if env not set yet)
  if (process.env.NODE_ENV !== 'test') {
    console.warn('[R2] Missing one or more R2 environment variables.')
  }
}

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? ''
