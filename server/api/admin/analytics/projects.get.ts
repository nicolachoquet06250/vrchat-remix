import { eq, sql, count } from 'drizzle-orm'
import { getDb } from '~~/server/db/client'
import { downloads, projects } from '~~/server/db/schema'
import { getSession } from '~~/server/utils/auth'
import { z } from 'zod'

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

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

  const query = getQuery(event)
  const parsed = QuerySchema.safeParse(query)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid query', data: parsed.error.flatten() })
  }

  const { page, limit } = parsed.data
  const offset = (page - 1) * limit

  const db = getDb()

  // Récupère le nombre total de projets
  const [{ total }] = await db.select({ total: count() }).from(projects)

  // Récupère tous les projets avec leur nombre de téléchargements (même si 0)
  const rows = await db.select({
    id: projects.id,
    name: projects.name,
    downloadCount: sql<number>`CAST(COUNT(${downloads.id}) AS UNSIGNED)`
  })
  .from(projects)
  .leftJoin(downloads, eq(projects.id, downloads.projectId))
  .groupBy(projects.id, projects.name)
  .orderBy(projects.name)
  .limit(limit)
  .offset(offset)

  const next = page < Math.ceil(total / limit) ? `/api/admin/analytics/projects?page=${page + 1}&limit=${limit}` : null
  const previous = page > 1 ? `/api/admin/analytics/projects?page=${page - 1}&limit=${limit}` : null

  return {
    projects: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    next,
    previous
  }
})
