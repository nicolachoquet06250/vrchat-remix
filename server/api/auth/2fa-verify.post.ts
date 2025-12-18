import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { users } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { verifyPassword, createSessionJwt, setSessionCookie } from '~~/server/utils/auth'

const VerifySchema = z.object({
  challengeId: z.string().min(10),
  code: z.string().regex(/^\d{6}$/),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = VerifySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body', data: parsed.error.flatten() })
  }
  const { challengeId, code } = parsed.data

  const db = getDb()
  const query = db.query
  if (!('users' in query)) return query

  const user = await query.users.findFirst({
    where: (u, { eq }) => eq(u.twoFactorToken, challengeId),
  })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Défi introuvable' })
  }

  // Vérifier expiration et tentatives
  if (!user.twoFactorExpiresAt || new Date(user.twoFactorExpiresAt).getTime() < Date.now()) {
    // Nettoyage
    await db.update(users).set({ twoFactorToken: null, twoFactorCodeHash: null, twoFactorExpiresAt: null }).where(eq(users.id, user.id))
    throw createError({ statusCode: 401, statusMessage: 'Code expiré, veuillez recommencer la connexion.' })
  }
  if ((user.twoFactorAttempts ?? 0) >= 5) {
    await db.update(users).set({ twoFactorToken: null, twoFactorCodeHash: null, twoFactorExpiresAt: null }).where(eq(users.id, user.id))
    throw createError({ statusCode: 429, statusMessage: 'Trop de tentatives, veuillez recommencer.' })
  }

  const ok = user.twoFactorCodeHash ? await verifyPassword(user.twoFactorCodeHash, code) : false
  if (!ok) {
    await db.update(users).set({ twoFactorAttempts: (user.twoFactorAttempts ?? 0) + 1 }).where(eq(users.id, user.id))
    throw createError({ statusCode: 401, statusMessage: 'Code invalide' })
  }

  // Succès: créer la session puis nettoyer les champs 2FA
  const token = await createSessionJwt({ sub: String(user.id), email: user.email, username: user.username })
  setSessionCookie(event, token)

  await db.update(users).set({
    twoFactorToken: null,
    twoFactorCodeHash: null,
    twoFactorExpiresAt: null,
    twoFactorAttempts: 0,
  }).where(eq(users.id, user.id))

  return { id: user.id, email: user.email, username: user.username }
})
