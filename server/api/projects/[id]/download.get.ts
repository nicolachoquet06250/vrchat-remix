import { z } from 'zod'
import { getDb } from '~~/server/db/client'

const ParamsSchema = z.object({ id: z.coerce.number().int().min(1) })

export default defineEventHandler(async (event) => {
  const params = getRouterParams(event)
  const parsed = ParamsSchema.safeParse(params)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id', data: parsed.error.flatten() })
  }
  const id = parsed.data.id
  const db = getDb()
  const proj = await db.query.projects.findFirst({ where: (p, { eq }) => eq(p.id, id) })
  if (!proj) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  const anyProj: any = proj
  if (!anyProj.fileData || !anyProj.fileSize) {
    throw createError({ statusCode: 404, statusMessage: 'No file available' })
  }
  setHeader(event, 'Content-Type', anyProj.fileType || 'application/zip')
  const filename = (anyProj.fileName || 'project.zip').replace(/\r|\n/g, '')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  return anyProj.fileData as Buffer
})
