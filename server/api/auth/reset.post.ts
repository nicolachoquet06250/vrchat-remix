import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { users } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '~~/server/utils/auth'

const Schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }
  const { token, password } = parsed.data

  const db = getDb()
  const query = db.query
  if (!('users' in query)) return query

  const user = await query.users.findFirst({
    where: (u, { eq }) => eq(u.resetToken, token),
  })

  if (!user || !user.resetExpiresAt || user.resetExpiresAt < new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired token' })
  }

  const passwordHash = await hashPassword(password)

  await db.update(users)
    .set({ passwordHash: passwordHash as any, resetToken: null as any, resetExpiresAt: null as any })
    .where(eq(users.id, user.id))

  return { ok: true }
})
