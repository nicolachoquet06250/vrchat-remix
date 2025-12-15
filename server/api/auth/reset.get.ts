import { getDb } from '~~/server/db/client'

export default defineEventHandler(async (event) => {
  const token = getQuery(event).token as string | undefined
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Missing token' })
  }

  const db = getDb()
  const query = db.query
  if (!('users' in query)) return query

  const user = await query.users.findFirst({
    where: (u, { eq }) => eq(u.resetToken, token),
    columns: { id: true, resetExpiresAt: true },
  })

  if (!user || !user.resetExpiresAt || user.resetExpiresAt < new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or expired token' })
  }

  return { ok: true }
})
