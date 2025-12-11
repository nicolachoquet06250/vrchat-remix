import { z } from 'zod'
import { getDb } from '~~/server/db/client'

const ParamsSchema = z.object({ imageId: z.coerce.number().int().min(1) })

export default defineEventHandler(async (event) => {
  const params = getRouterParams(event)
  const parsed = ParamsSchema.safeParse(params)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image id', data: parsed.error.flatten() })
  }
  const imageId = parsed.data.imageId
  const db = getDb()
  const row = await db.query.projectImages.findFirst({ where: (pi, { eq }) => eq(pi.id, imageId) })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  const data = (row as any).fileData as Buffer | null
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Image data missing' })
  setResponseHeader(event, 'Content-Type', row.fileType || 'application/octet-stream')
  setResponseHeader(event, 'Content-Length', row.fileSize || data.length)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=86400, immutable')
  return data
})
