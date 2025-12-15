import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { users } from '~~/server/db/schema'
import { and, eq, ne } from 'drizzle-orm'
import { requireAuth } from '~~/server/utils/auth'
import { randomBytes } from 'node:crypto'
import { sendVerificationEmail } from '~~/server/utils/mail'

const BodySchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(32).optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'Aucun champ à mettre à jour' })

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const body = await readBody(event)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Corps invalide', data: parsed.error.flatten() })
  }
  const { email, username } = parsed.data

  const db = getDb()
  const query = db.query
  if (!('users' in query)) return query

  const id = Number(session.sub)
  const current = await query.users.findFirst({ where: eq(users.id, id) })
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Utilisateur introuvable' })

  // Uniqueness checks
  if (email && email !== current.email) {
    const exists = await query.users.findFirst({ where: and(eq(users.email, email), ne(users.id, id)) })
    if (exists) throw createError({ statusCode: 409, statusMessage: 'Email déjà utilisé' })
  }
  if (username && username !== current.username) {
    const exists = await query.users.findFirst({ where: and(eq(users.username, username), ne(users.id, id)) })
    if (exists) throw createError({ statusCode: 409, statusMessage: 'Pseudo déjà utilisé' })
  }

  const now = new Date()
  let requiresVerification = false
  let verificationToken: string | null = null
  let verificationExpiresAt: Date | null = null
  let emailVerifiedAt: Date | null | undefined = undefined

  if (email && email !== current.email) {
    requiresVerification = true
    verificationToken = randomBytes(32).toString('hex')
    verificationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48) // 48h
    emailVerifiedAt = null
  }

  await db.update(users)
    .set({
      email: email ?? current.email,
      username: username ?? current.username,
      updatedAt: now as any,
      verificationToken: (verificationToken as any) ?? (current.verificationToken as any),
      verificationExpiresAt: (verificationExpiresAt as any) ?? (current.verificationExpiresAt as any),
      ...(emailVerifiedAt !== undefined ? { emailVerifiedAt: emailVerifiedAt as any } : {}),
    })
    .where(eq(users.id, current.id))

  if (requiresVerification && email && verificationToken) {
    // Fire-and-forget
    sendVerificationEmail(email, verificationToken, username || current.username).catch(() => {})
  }

  return { ok: true, requiresVerification }
})
