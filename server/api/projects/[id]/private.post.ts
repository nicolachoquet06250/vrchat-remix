import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { projects, users } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'
import { eq } from 'drizzle-orm'
import { sendProjectDeletedEmail, sendProjectPrivateWarningEmail } from '~~/server/utils/mail'

const ParamsSchema = z.object({ id: z.coerce.number().int().min(1) })

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const params = getRouterParams(event)
  const parsed = ParamsSchema.safeParse(params)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id', data: parsed.error.flatten() })
  }
  const id = parsed.data.id

  const db = getDb()
  // Fetch current user with role
  const currentUser = await db.query.users.findFirst({ where: eq(users.id, Number(session.sub)) })
  if (!currentUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const role = (currentUser as any).role as string
  if (role !== 'moderator' && role !== 'creator') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const proj = await db.query.projects.findFirst({ where: eq(projects.id, id) })
  if (!proj) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

  // If already private, still count a strike only if coming from a moderator action
  const newCount = Number((proj as any).privateStrikeCount || 0) + 1

  // Update to private and increment counter
  await db.update(projects)
    .set({ isPublic: 0 as any, privateStrikeCount: newCount as any, lastPrivatedAt: new Date() as any })
    .where(eq(projects.id, id))

  // On 2nd strike, warn owner by e‑mail that 3rd will delete
  if (newCount === 2) {
    const owner = await db.query.users.findFirst({ where: eq(users.id, Number((proj as any).userId)) })
    if (owner && (owner as any).email) {
      sendProjectPrivateWarningEmail((owner as any).email, {
        projectId: id,
        projectName: (proj as any).name,
        strikes: newCount,
      }).catch(() => {})
    }
  }

  // On 3rd strike, delete project and notify owner
  if (newCount >= 3) {
    const owner = await db.query.users.findFirst({ where: eq(users.id, Number((proj as any).userId)) })
    if (owner && (owner as any).email) {
      sendProjectDeletedEmail((owner as any).email, {
        projectId: id,
        projectName: (proj as any).name,
      }).catch(() => {})
    }
    await db.delete(projects).where(eq(projects.id, id))
    return { ok: true, deleted: true, strikes: newCount }
  }

  return { ok: true, deleted: false, strikes: newCount }
})
