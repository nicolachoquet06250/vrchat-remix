import { requireAuth } from '~~/server/utils/auth'
import { getDb } from '~~/server/db/client'
import { users } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = getDb()
  const query = db.query
  if (!('users' in query)) return { enabled: false }

  const user = await query.users.findFirst({ where: eq(users.id, Number(session.sub)) })
  return { enabled: !!(user?.twoFactorEnabled) }
})
