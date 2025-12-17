import { eq, sql } from 'drizzle-orm'
import { getDb } from '~~/server/db/client'
import { downloads } from '~~/server/db/schema'
import { getSession } from '~~/server/utils/auth'
import { z } from 'zod'

const QuerySchema = z.object({
  projectId: z.coerce.number().int().min(1).optional(),
})

export default defineEventHandler(async (event) => {
  const session = await getSession(event)
  if (!session) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const query = getQuery(event)
  const parsed = QuerySchema.safeParse(query)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid query', data: parsed.error.flatten() })
  }
  const projectId = parsed.data.projectId

  const db = getDb()
  // Si projectId est fourni, vérifier que l'utilisateur courant est le créateur du projet
  if (projectId) {
    const proj = await db.query.projects.findFirst({ where: (p, { eq }) => eq(p.id, projectId) })
    if (!proj) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
    if (Number(session.sub) !== (proj as any).userId) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  }
  const rows = await db.select({
    year: sql<number>`YEAR(${downloads.createdAt})`,
    count: sql<number>`COUNT(*)`,
  }).from(downloads)
    .where(projectId ? eq(downloads.projectId, projectId) : undefined as any)
    .groupBy(sql`YEAR(${downloads.createdAt})`)
    .orderBy(sql`YEAR(${downloads.createdAt}) DESC`)

  const years = (rows as any[]).map(r => Number(r.year))
  // Maximum 5 dernières années avec données
  return { years: years.slice(0, 5) }
})
