import { z } from 'zod'
import { getProjectWithTags } from '~~/server/utils/projects'
import { getDb } from '~~/server/db/client'
import { getSession } from '~~/server/utils/auth'
import {eq} from "drizzle-orm";
import {projects} from "~~/server/db/schema";

const ParamsSchema = z.object({ id: z.coerce.number().int().min(1) })

export default defineEventHandler(async (event) => {
  const params = getRouterParams(event)
  const parsed = ParamsSchema.safeParse(params)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id', data: parsed.error.flatten() })
  }
  const id = parsed.data.id
  // Access control: public or owner
  const db = getDb()
  const row = await db.query.projects.findFirst({ where: eq(projects.id, id) })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  if (!(row as any).isPublic) {
    const session = await getSession(event)
    if (!session || Number(session.sub) !== (row as any).userId) {
      throw createError({ statusCode: 404, statusMessage: 'Project not found' })
    }
  }
  const proj = await getProjectWithTags(id)
  if (!proj) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  return proj
})
