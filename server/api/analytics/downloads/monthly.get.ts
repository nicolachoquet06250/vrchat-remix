import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '~~/server/db/client'
import { downloads } from '~~/server/db/schema'
import { getSession } from '~~/server/utils/auth'

const QuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(3000).optional(),
  projectId: z.coerce.number().int().min(1).optional(),
})

export default defineEventHandler(async (event) => {
  // restreindre aux utilisateurs connectés (peut évoluer vers admin si besoin)
  const session = await getSession(event)
  if (!session) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const query = getQuery(event)
  const parsed = QuerySchema.safeParse(query)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid query', data: parsed.error.flatten() })
  }
  const now = new Date()
  const year = parsed.data.year ?? now.getFullYear()
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

  // Récupère les comptes par mois et par statut (auth vs anon)
  const rows = await db.select({
    month: sql<number>`MONTH(${downloads.createdAt})`,
    isAuthenticated: downloads.isAuthenticated,
    count: sql<number>`COUNT(*)`,
  }).from(downloads)
    .where(projectId
      ? and(
          sql`YEAR(${downloads.createdAt}) = ${year}`,
          eq(downloads.projectId, projectId)
        )
      : sql`YEAR(${downloads.createdAt}) = ${year}`
    )
    .groupBy(sql`MONTH(${downloads.createdAt})`, downloads.isAuthenticated)
    .orderBy(sql`MONTH(${downloads.createdAt})`)

  // Construire 12 mois (1..12) avec 0 par défaut
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const authenticated: number[] = months.map(() => 0)
  const anonymous: number[] = months.map(() => 0)

  for (const r of rows as any[]) {
    const m = r.month as number
    const idx = m - 1
    if (idx >= 0 && idx < 12) {
      if ((r.isAuthenticated as number) === 1) authenticated[idx] = Number(r.count)
      else anonymous[idx] = Number(r.count)
    }
  }

  // Limiter à janvier → mois courant si année en cours
  const endMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12

  return {
    year,
    endMonth,
    labels: months.slice(0, endMonth),
    authenticated: authenticated.slice(0, endMonth),
    anonymous: anonymous.slice(0, endMonth),
    all: authenticated.map((a, i) => a + anonymous[i]).slice(0, endMonth),
  }
})
