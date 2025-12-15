import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { projectFavorites, projects } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'
import { and, eq } from 'drizzle-orm'

const ParamsSchema = z.object({ id: z.coerce.number().int().min(1) })

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const params = getRouterParams(event)
  const parsed = ParamsSchema.safeParse(params)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id', data: parsed.error.flatten() })
  }
  const projectId = parsed.data.id

  const db = getDb()
  // ensure project exists and is accessible (public or owner)
  const proj = await db.query.projects.findFirst({ where: eq(projects.id, projectId) })
  if (!proj) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  if (!proj.isPublic && proj.userId !== Number(session.sub)) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }
  // upsert-like: ignore if already exists
  try {
    await db.insert(projectFavorites).values({ userId: Number(session.sub), projectId })
  } catch {
    // ignore on duplicate
  }
  const row = await db.query.projectFavorites.findFirst({
    where: and(eq(projectFavorites.userId, Number(session.sub)), eq(projectFavorites.projectId, projectId)),
  })
  return { ok: true, isFavorite: !!row }
})
