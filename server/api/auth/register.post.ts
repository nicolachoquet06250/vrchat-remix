import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { users } from '~~/server/db/schema'
import { hashPassword } from '~~/server/utils/auth'
import {sendVerificationEmail} from '~~/server/utils/mail'
import { randomBytes } from 'node:crypto'

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
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48) // 48h
    await db.insert(users).values({
      email,
      username,
      passwordHash,
      verificationToken: token,
      verificationExpiresAt: expiresAt,
    })

    const created = await query.users.findFirst({where: (u, {eq}) => eq(u.email, email)})
    if (!created) throw createError({statusCode: 500, statusMessage: 'Failed to create user'})

    // Send verification email (fire-and-forget)
    sendVerificationEmail(email, created.verificationToken!, username).catch((err) => {
      console.error('[mail] verification email failed', err)
    })

    // Do not create a session yet; require email verification first
    return { ok: true }
  }

  return query;
})
