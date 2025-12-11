import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { userAvatars } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

const ParamsSchema = z.object({ id: z.coerce.number().int().min(1) })

export default defineEventHandler(async (event) => {
  const params = getRouterParams(event)
  const parsed = ParamsSchema.safeParse(params)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user id', data: parsed.error.flatten() })
  }
  const userId = parsed.data.id
  const db = getDb()
  const avatar = await db.select().from(userAvatars).where(eq(userAvatars.userId, userId)).limit(1)
  const row = avatar[0]
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Avatar not found' })
  const data = (row as any).fileData as Buffer | null
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Avatar data missing' })
  const type = (row as any).fileType || 'application/octet-stream'
  const size = (row as any).fileSize || data.length
  setResponseHeader(event, 'Content-Type', type)
  setResponseHeader(event, 'Content-Length', size)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=86400, immutable')
  return data
})
