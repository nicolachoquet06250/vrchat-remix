import { sql } from 'drizzle-orm'
import { getDb } from '~~/server/db/client'
import { downloads } from '~~/server/db/schema'
import { getSession } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await getSession(event)
  if (!session) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  
  // Vérifier le rôle de l'utilisateur (doit être 'creator')
  const user = await getDb().query.users.findFirst({
    where: (u, { eq }) => eq(u.id, Number(session.sub))
  })
  
  if (user?.role !== 'creator') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const db = getDb()
  const rows = await db.select({
    year: sql<number>`YEAR(${downloads.createdAt})`,
    count: sql<number>`COUNT(*)`,
  }).from(downloads)
    .groupBy(sql`YEAR(${downloads.createdAt})`)
    .orderBy(sql`YEAR(${downloads.createdAt}) DESC`)

  const years = (rows as any[]).map(r => Number(r.year))
  // Maximum 5 dernières années avec données
  return { years: years.slice(0, 5) }
})
