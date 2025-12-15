import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { projectFavorites } from '~~/server/db/schema'
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
  await db.delete(projectFavorites).where(and(
    eq(projectFavorites.userId, Number(session.sub)),
    eq(projectFavorites.projectId, projectId)
  ))
  return { ok: true, isFavorite: false }
})
