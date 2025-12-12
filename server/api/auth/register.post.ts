import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { users } from '~~/server/db/schema'
import { createSessionJwt, hashPassword, setSessionCookie } from '~~/server/utils/auth'
import { sendSignupConfirmation } from '~~/server/utils/mail'

const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(128),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = RegisterSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body', data: parsed.error.flatten() })
  }
  const { email, username, password } = parsed.data

  const db = getDb()

  const query = db.query;
  if ('users' in query) {
    const existing = await query.users.findFirst({
      where: (u, {eq, or}) => or(eq(u.email, email), eq(u.username, username)),
      columns: {id: true},
    })
    if (existing) {
      throw createError({statusCode: 409, statusMessage: 'Email or username already in use'})
    }

    const passwordHash = await hashPassword(password)
    await db.insert(users).values({email, username, passwordHash})

    const created = await query.users.findFirst({where: (u, {eq}) => eq(u.email, email)})
    if (!created) throw createError({statusCode: 500, statusMessage: 'Failed to create user'})

    const token = await createSessionJwt({sub: String(created.id), email, username})
    setSessionCookie(event, token)

    // Fire-and-forget signup confirmation email; do not block success if it fails
    sendSignupConfirmation(email, username).catch((err) => {
      console.error('[mail] signup confirmation failed', err)
    })

    return {id: created.id, email, username, createdAt: created.createdAt}
  }

  return query;
})
