import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { users } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'
import { eq } from 'drizzle-orm'

const ParamsSchema = z.object({ id: z.coerce.number().int().min(1) })
const BodySchema = z.object({ role: z.enum(['user', 'moderator']) })

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = getDb()

  // Only creator can change roles
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

  const body = await readBody(event)
  const bodyParsed = BodySchema.safeParse(body)
  if (!bodyParsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body', data: bodyParsed.error.flatten() })
  }
  const newRole = bodyParsed.data.role

  // Do not allow changing the role of any existing creator through this endpoint
  const target = await db.query.users.findFirst({ where: eq(users.id, targetId) })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if ((target as any).role === 'creator') {
    throw createError({ statusCode: 400, statusMessage: 'Impossible de modifier le rôle du creator.' })
  }

  // Update role
  await db.update(users).set({ role: newRole as any }).where(eq(users.id, targetId))
  return { ok: true }
})
