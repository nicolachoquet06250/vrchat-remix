import {eq, or} from "drizzle-orm"
import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { verifyPassword, createSessionJwt, setSessionCookie } from '~~/server/utils/auth'
import {users} from "~~/server/db/schema";

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

    const token = await createSessionJwt({ sub: String(user.id), email: user.email, username: user.username })
    setSessionCookie(event, token)
    return { id: user.id, email: user.email, username: user.username }
  }

  return query;
})
