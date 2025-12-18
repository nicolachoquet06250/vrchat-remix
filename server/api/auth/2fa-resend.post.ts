import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { users } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '~~/server/utils/auth'
import crypto from 'node:crypto'
import { sendTwoFactorCodeEmail } from '~~/server/utils/mail'

const Body = z.object({ challengeId: z.string().min(10) })

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body', data: parsed.error.flatten() })
  }
  const { challengeId } = parsed.data

  const db = getDb()
  const query = db.query
  if (!('users' in query)) return { ok: true }

  const user = await query.users.findFirst({ where: (u, { eq }) => eq(u.twoFactorToken, challengeId) })
  if (!user) {
    // anti enumeration: répondre ok
    return { ok: true }
  }

  // Regénérer un nouveau code et prolonger l'expiration
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const codeHash = await hashPassword(code)
  const newChallengeId = crypto.randomBytes(16).toString('hex')
  const expires = new Date(Date.now() + 10 * 60 * 1000)

  await db.update(users).set({
    twoFactorToken: newChallengeId,
    twoFactorCodeHash: codeHash,
    twoFactorExpiresAt: expires,
    twoFactorAttempts: 0,
  }).where(eq(users.id, user.id))

  sendTwoFactorCodeEmail(user.email, { code, username: user.username }).catch(() => {})

  return { twoFactorRequired: true, challengeId: newChallengeId }
})
