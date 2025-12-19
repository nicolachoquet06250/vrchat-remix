import { getDb } from '~~/server/db/client'
import { requireAuth } from '~~/server/utils/auth'
import {userAvatars, users} from '~~/server/db/schema'
import { eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = getDb()
  const id = Number(session.sub)
  const query = db.query;
  if ('users' in query) {
    const q = db.select({
      id: users.id,
      email: users.email,
      username: users.username,
      createdAt: users.createdAt,
      role: users.role,
      hasAvatar: sql`${userAvatars.id} IS NOT NULL`,
      avatarUrl: sql`IF(hasAvatar IS NULL, '', CONCAT('/api/users/', ${userAvatars.id}, '/avatar'))`
    })
        .from(users)
        .where(eq(users.id, id))
        .toSQL();
    console.log(q.sql, q.params, query.users.findFirst({
      where: eq(users.id, id),
      with: {
        avatar: true
      }
    }).toSQL().sql);

    const user = await query.users.findFirst({
      where: eq(users.id, id)
    })
    if (!user) throw createError({statusCode: 404, statusMessage: 'User not found'})
    // Check avatar existence in separate table without fetching blob
    const avatarRow = await db
        .select({ id: userAvatars.id })
        .from(userAvatars)
        .where(eq(userAvatars.userId, id))
        .limit(1)
    const hasAvatar = avatarRow.length > 0
    const avatarUrl = hasAvatar ? `/api/users/${user.id}/avatar` : null
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      hasAvatar,
      avatarUrl,
      role: user.role
    }
  }

  return query;
})
