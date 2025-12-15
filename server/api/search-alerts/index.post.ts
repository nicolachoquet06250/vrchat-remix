import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { savedSearches } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'

const BodySchema = z.object({
  type: z.enum(['project', 'tag']),
  query: z.string().min(2).max(200),
})

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = getDb()
  const body = await readBody(event)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body', data: parsed.error.flatten() })
  }
  const { type } = parsed.data
  const query = parsed.data.query.trim().toLowerCase()

  try {
    await db.insert(savedSearches).values({
      userId: Number(session.sub),
      type,
      query,
    })
  } catch (e: any) {
    // unique constraint: already exists
    if (String(e?.message || '').toLowerCase().includes('duplicate')) {
      // idempotent create
      // find existing to return
    } else {
      throw e
    }
  }

  const existing = await db.query.savedSearches.findFirst({
    where: (s, { and, eq }) => and(eq(s.userId, Number(session.sub)), eq(s.type, type), eq(s.query, query)),
    orderBy: (s, { desc }) => [desc(s.id)],
  })
  return existing
})
