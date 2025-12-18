import { z } from 'zod'
import { requireAuth, verifyPassword } from '~~/server/utils/auth'
import { getDb } from '~~/server/db/client'
import { users } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { sendTwoFactorDisabledEmail } from '~~/server/utils/mail'

const Body = z.object({ password: z.string().min(8).max(128) })

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const body = await readBody(event)
  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body', data: parsed.error.flatten() })
  }
  const { password } = parsed.data

  const db = getDb()
  const query = db.query
  if (!('users' in query)) return { enabled: false }

  const user = await query.users.findFirst({ where: (u, { eq }) => eq(u.id, Number(session.sub)) })
  if (!user) throw createError({ statusCode: 404, statusMessage: 'Utilisateur introuvable' })

  const ok = await verifyPassword(user.passwordHash, password)
  if (!ok) throw createError({ statusCode: 401, statusMessage: 'Mot de passe invalide' })

  if (user.twoFactorEnabled) {
    await db.update(users).set({
      twoFactorEnabled: 0,
      twoFactorToken: null,
      twoFactorCodeHash: null,
      twoFactorExpiresAt: null,
      twoFactorAttempts: 0,
    }).where(eq(users.id, user.id))
    // fire-and-forget email
    sendTwoFactorDisabledEmail(user.email, { username: user.username }).catch(() => {})
  }

  return { enabled: false }
})
