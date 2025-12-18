import {eq, or} from "drizzle-orm"
import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { verifyPassword, createSessionJwt, setSessionCookie, hashPassword } from '~~/server/utils/auth'
import {users} from "~~/server/db/schema";
import { eq as eqOp } from 'drizzle-orm'
import crypto from 'node:crypto'
import {sendTwoFactorCodeEmail} from '~~/server/utils/mail'

const LoginSchema = z.object({
  emailOrUsername: z.string().min(3),
  password: z.string().min(8).max(128),
})

export default defineEventHandler( async (event) => {
  const body = await readBody(event)
  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body', data: parsed.error.flatten() })
  }
  const { emailOrUsername, password } = parsed.data

  const db = getDb()
  const query = db.query;
  if ('users' in query) {
    const user = await query.users.findFirst({
      where: or(
          eq(users.email, emailOrUsername),
          eq(users.username, emailOrUsername)
      ),
    })
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
    }
    if ((user as any).disabledAt) {
      throw createError({ statusCode: 403, statusMessage: 'Votre compte est désactivé.' })
    }
    const ok = await verifyPassword(user.passwordHash, password)
    if (!ok) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
    }

    // Block login if email not verified
    if (!user.emailVerifiedAt) {
      throw createError({ statusCode: 401, statusMessage: 'Veuillez vérifier votre e‑mail pour activer votre compte.' })
    }

    // Si 2FA désactivé → session immédiate
    // @ts-ignore drizzle types: twoFactorEnabled est un int(0/1)
    if (!user.twoFactorEnabled) {
      const token = await createSessionJwt({ sub: String(user.id), email: user.email, username: user.username })
      setSessionCookie(event, token)
      return { id: user.id, email: user.email, username: user.username }
    }

    // 2FA activé: on génère un code à 6 chiffres, on le stocke (hashé) avec un challengeId et on l'envoie par e‑mail.
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const codeHash = await hashPassword(code)
    const challengeId = crypto.randomBytes(16).toString('hex')
    const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await db.update(users)
      .set({
        twoFactorToken: challengeId,
        twoFactorCodeHash: codeHash,
        twoFactorExpiresAt: expires,
        twoFactorAttempts: 0,
      })
      .where(eqOp(users.id, user.id))

    // Envoi e‑mail (fire-and-forget)
    sendTwoFactorCodeEmail(user.email, { code, username: user.username }).catch(() => {})

    // On ne crée pas la session ici; on renvoie un statut indiquant que la 2FA est requise
    return { twoFactorRequired: true, challengeId }
  }

  return query;
})
