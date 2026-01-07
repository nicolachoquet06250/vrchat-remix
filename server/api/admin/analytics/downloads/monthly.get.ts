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
  const now = new Date()
  const year = parsed.data.year ?? now.getFullYear()
  const projectId = parsed.data.projectId

  const db = getDb()

  // Récupère les comptes par mois et par statut (auth vs anon)
  const whereConditions = [eq(sql`YEAR(${downloads.createdAt})`, year)]
  if (projectId) {
    whereConditions.push(eq(downloads.projectId, projectId))
  }

  const rows = await db.select({
    month: sql<number>`MONTH(${downloads.createdAt})`,
    isAuthenticated: downloads.isAuthenticated,
    count: sql<number>`COUNT(*)`,
  }).from(downloads)
    .where(and(...whereConditions))
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

  const endMonth = 12

  return {
    year,
    endMonth,
    labels: months.slice(0, endMonth),
    authenticated: authenticated.slice(0, endMonth),
    anonymous: anonymous.slice(0, endMonth),
    all: authenticated.map((a, i) => a + anonymous[i]).slice(0, endMonth),
  }
})
