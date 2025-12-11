import { getDb } from '~~/server/db/client'
import { userAvatars } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'

const ACCEPTED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
])

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const userId = Number(session.sub)

  const form = await readMultipartFormData(event)
  if (!form) {
    throw createError({ statusCode: 400, statusMessage: 'Formdata required' })
  }

  // Find first file part
  let filePart: { filename?: string; type?: string; data: Buffer } | null = null
  for (const part of form) {
    if (part.name === 'file') {
      // @ts-ignore
      filePart = { filename: part.filename, type: part.type, data: part.data }
      break
    }
  }
  if (!filePart) {
    throw createError({ statusCode: 400, statusMessage: 'Aucune image fournie' })
  }

  const name = filePart.filename || 'avatar'
  let mime = filePart.type || ''
  const lower = name.toLowerCase()
  if (!mime) {
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg'
    else if (lower.endsWith('.png')) mime = 'image/png'
    else if (lower.endsWith('.gif')) mime = 'image/gif'
    else if (lower.endsWith('.webp')) mime = 'image/webp'
  }
  if (!mime || !ACCEPTED_TYPES.has(mime)) {
    throw createError({ statusCode: 400, statusMessage: `Type d'image non supporté (${mime || 'inconnu'})` })
  }

  const data = filePart.data as any as Buffer
  const size = (data as any).length
  if (!size || size <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Image vide' })
  }

  const db = getDb()
  // Insert or update existing avatar row (unique on userId)
  await db.insert(userAvatars).values({
    userId,
    fileName: name,
    fileType: mime,
    fileSize: size,
    // @ts-ignore
    fileData: data,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      fileName: name,
      fileType: mime,
      fileSize: size,
      // @ts-ignore
      fileData: data,
      updatedAt: new Date(),
    }
  })

  return { ok: true }
})
