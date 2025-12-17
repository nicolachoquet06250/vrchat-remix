import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { users } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'
import { eq } from 'drizzle-orm'

const ParamsSchema = z.object({ id: z.coerce.number().int().min(1) })

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = getDb()
  // Check current user role (must be creator)
  const me = await db.query.users.findFirst({ where: eq(users.id, Number(session.sub)) })
  if (!me || (me as any).role !== 'creator') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const params = getRouterParams(event)
  const parsed = ParamsSchema.safeParse(params)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id', data: parsed.error.flatten() })
  }
  const targetId = parsed.data.id
  await db.update(users).set({ disabledAt: new Date() as any }).where(eq(users.id, targetId))
  return { ok: true }
})
