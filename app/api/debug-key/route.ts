import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-ext'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

// Temporary debug endpoint — remove after fixing key issue
export async function GET(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: { provider: true, encryptedKey: true, modelName: true, updatedAt: true },
  })

  const result = keys.map((k) => {
    let decrypted = ''
    let error = ''
    try {
      decrypted = decrypt(k.encryptedKey)
    } catch (e) {
      error = String(e)
    }
    return {
      provider: k.provider,
      model: k.modelName,
      updatedAt: k.updatedAt,
      keyPreview: decrypted ? `${decrypted.slice(0, 8)}...${decrypted.slice(-4)}` : null,
      keyLength: decrypted.length,
      decryptError: error || null,
    }
  })

  return NextResponse.json({ userId: user.id, keys: result })
}
