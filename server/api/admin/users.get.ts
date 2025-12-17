import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { requireAuth } from '~~/server/utils/auth'
import {userAvatars, users} from '~~/server/db/schema'
import {eq, like, or, sql} from 'drizzle-orm'

const QuerySchema = z.object({
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export default defineEventHandler(async (event) => {
  // Auth + ACL: creator only
  const session = await requireAuth(event)
  const db = getDb()
  const me = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, Number(session.sub))
  })
  if (!me || (me as any).role !== 'creator') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const parsed = QuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid query', data: parsed.error.flatten() })
  }
  const { q, page, pageSize } = parsed.data

  const where: any = []
  if (q && q.trim()) {
    const term = `%${q.trim()}%`
    where.push(or(like(users.username, term), like(users.email, term)))
  }

  const totalRows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(users)
    .where(where.length ? (where.length === 1 ? where[0] : (or as any)(...where)) : undefined as any)

  const total = Number(totalRows[0]?.count ?? 0)
  const offset = (page - 1) * pageSize

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      hasAvatar: sql`${userAvatars.id} IS NOT NULL`,
      avatarUrl: sql`CONCAT('/api/users/', ${userAvatars.id}, '/avatar')`
    })
    .from(users)
    .leftJoin(userAvatars, eq(users.id, userAvatars.userId))
    .where(where.length ? (where.length === 1 ? where[0] : (or as any)(...where)) : undefined as any)
    .orderBy(users.createdAt)
    .limit(pageSize)
    .offset(offset)

  return { items: rows as any[], total, page, pageSize }
})
