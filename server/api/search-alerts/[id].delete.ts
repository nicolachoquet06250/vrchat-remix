import { getDb } from '~~/server/db/client'
import { savedSearches } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'
import {eq} from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = getDb()
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }
  // ensure it belongs to user
  const row = await db.query.savedSearches.findFirst({ where: (s, { and, eq }) => and(eq(s.id, id), eq(s.userId, Number(session.sub))) })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  await db.delete(savedSearches).where(eq(savedSearches.id, id))
  return { ok: true }
})
