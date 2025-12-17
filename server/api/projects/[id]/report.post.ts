import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { projectReports, projects, users } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'
import { eq } from 'drizzle-orm'
import { sendProjectReportedEmail } from '~~/server/utils/mail'

const ParamsSchema = z.object({ id: z.coerce.number().int().min(1) })
const BodySchema = z.object({ reason: z.string().max(500).optional() })

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const params = getRouterParams(event)
  const parsed = ParamsSchema.safeParse(params)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id', data: parsed.error.flatten() })
  }
  const id = parsed.data.id
  const bodyParsed = BodySchema.safeParse(await readBody(event))
  if (!bodyParsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body', data: bodyParsed.error.flatten() })
  }
  const reason = bodyParsed.data.reason

  const db = getDb()
  const proj = await db.query.projects.findFirst({ where: eq(projects.id, id) })
  if (!proj) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

  // Insert report
  await db.insert(projectReports).values({ projectId: id, reporterUserId: Number(session.sub), reason: reason || null as any })

  // Notify moderators
  const moderators = await db.select().from(users).where(eq(users.role, 'moderator' as any))
  for (const m of moderators as any[]) {
    if (!m.email) continue
    sendProjectReportedEmail(m.email, {
      projectId: id,
      projectName: (proj as any).name,
      reporter: session.username,
      reason,
    }).catch(() => {})
  }

  return { ok: true }
})
