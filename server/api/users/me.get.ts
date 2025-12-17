import { getDb } from '~~/server/db/client'
import { requireAuth } from '~~/server/utils/auth'
import { userAvatars } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = getDb()
  const id = Number(session.sub)
  const query = db.query;
  if ('users' in query) {
    const user = await query.users.findFirst({where: (u, {eq}) => eq(u.id, id)})
    if (!user) throw createError({statusCode: 404, statusMessage: 'User not found'})
    // Check avatar existence in separate table without fetching blob
    const db = getDb()
    const avatarRow = await db.select({ id: userAvatars.id }).from(userAvatars).where(eq(userAvatars.userId, id)).limit(1)
    const hasAvatar = avatarRow.length > 0
    const avatarUrl = hasAvatar ? `/api/users/${user.id}/avatar` : null
    return {id: user.id, email: user.email, username: user.username, createdAt: user.createdAt, hasAvatar, avatarUrl, role: (user as any).role}
  }

  return query;
})
