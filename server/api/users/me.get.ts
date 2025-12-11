import { getDb } from '~~/server/db/client'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = getDb()
  const id = Number(session.sub)
  const query = db.query;
  if ('users' in query) {
    const user = await query.users.findFirst({where: (u, {eq}) => eq(u.id, id)})
    if (!user) throw createError({statusCode: 404, statusMessage: 'User not found'})
    return {id: user.id, email: user.email, username: user.username, createdAt: user.createdAt}
  }

  return query;
})
