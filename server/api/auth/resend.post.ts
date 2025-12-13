import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { sendVerificationEmail } from '~~/server/utils/mail'
import { users } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'

const Schema = z.object({
  emailOrUsername: z.string().min(3),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }
  const { emailOrUsername } = parsed.data

  const db = getDb()
  const query = db.query
  if (!('users' in query)) return query

  const user = await query.users.findFirst({
    where: (u, { eq, or }) => or(eq(u.email, emailOrUsername), eq(u.username, emailOrUsername)),
  })
  if (!user) {
    // Avoid user enumeration: return ok
    return { ok: true }
  }
  if (user.emailVerifiedAt) {
    return { ok: true }
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48)
  await db.update(users)
    .set({ verificationToken: token as any, verificationExpiresAt: expiresAt as any })
    .where(eq(users.id, user.id))

  await sendVerificationEmail(user.email, token, user.username)
  return { ok: true }
})
