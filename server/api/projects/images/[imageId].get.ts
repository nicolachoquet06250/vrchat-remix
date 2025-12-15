import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { getSession } from '~~/server/utils/auth'

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
  // Access control: only if parent project is public or requester is owner
  const proj = await db.query.projects.findFirst({ where: (p, { eq }) => eq(p.id, row.projectId) })
  if (!proj) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  if (!(proj as any).isPublic) {
    const session = await getSession(event)
    if (!session || Number(session.sub) !== (proj as any).userId) {
      throw createError({ statusCode: 404, statusMessage: 'Image not found' })
    }
  }
  const data = (row as any).fileData as Buffer | null
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Image data missing' })
  setResponseHeader(event, 'Content-Type', row.fileType || 'application/octet-stream')
  setResponseHeader(event, 'Content-Length', row.fileSize || data.length)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=86400, immutable')
  return data
})
