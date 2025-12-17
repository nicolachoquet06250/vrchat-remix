import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { users } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'
import { eq, inArray } from 'drizzle-orm'

const BodySchema = z.object({
  ids: z.array(z.number().int().min(1)).min(1),
  role: z.enum(['user', 'moderator'])
})

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = getDb()

  // Only creator can change roles
  const me = await db.query.users.findFirst({ where: eq(users.id, Number(session.sub)) })
  if (!me || (me as any).role !== 'creator') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body', data: parsed.error.flatten() })
  }
  const { ids, role } = parsed.data

  // Exclude any creator accounts from being updated
  const rows = await db.select({ id: users.id, role: users.role }).from(users).where(inArray(users.id, ids as any))
  const updatableIds = rows.filter((r: any) => r.role !== 'creator').map((r: any) => Number(r.id))
  if (updatableIds.length === 0) {
    return { ok: true, updated: 0 }
  }

  await db.update(users)
    .set({ role: role as any })
    .where(inArray(users.id, updatableIds as any))

  // Drizzle MySQL update() doesn't always return affected rows; best-effort count
  return { ok: true, updated: updatableIds.length }
})
