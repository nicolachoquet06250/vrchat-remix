import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { downloads } from '~~/server/db/schema'
import { getSession } from '~~/server/utils/auth'

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
  if (!(proj as any).isPublic) {
    const session = await getSession(event)
    if (!session || Number(session.sub) !== (proj as any).userId) {
      throw createError({ statusCode: 404, statusMessage: 'Project not found' })
    }
  }
  const anyProj: any = proj
  if (!anyProj.fileData || !anyProj.fileSize) {
    throw createError({ statusCode: 404, statusMessage: 'No file available' })
  }
  // Log download analytics (best-effort)
  try {
    const session = await getSession(event)
    await db.insert(downloads).values({
      projectId: anyProj.id,
      userId: session ? Number(session.sub) : null,
      isAuthenticated: session ? 1 : 0,
    })
  } catch (e) {
    // ne pas bloquer le téléchargement en cas d'erreur d'analytics
  }
  setHeader(event, 'Content-Type', anyProj.fileType || 'application/zip')
  const filename = (anyProj.fileName || 'project.zip').replace(/[\r\n]/g, '')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  return anyProj.fileData as Buffer
})
