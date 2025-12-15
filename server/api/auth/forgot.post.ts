import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { users } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { sendPasswordResetEmail } from '~~/server/utils/mail'

const Schema = z.object({
  email: z.string().email(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }
  const { email } = parsed.data

  const db = getDb()
  const query = db.query
  if (!('users' in query)) return query

  const user = await query.users.findFirst({
    where: (u, { eq: _eq }) => _eq(u.email, email),
  })

  // Toujours répondre OK pour éviter l'énumération d'utilisateurs
  if (!user) return { ok: true }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2) // 48h

  await db.update(users)
    .set({ resetToken: token as any, resetExpiresAt: expiresAt as any })
    .where(eq(users.id, user.id))

  // Envoi de l'email (fire-and-forget)
  sendPasswordResetEmail(user.email, token, user.username).catch(() => {})

  return { ok: true }
})
