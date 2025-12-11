import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { projectImages } from '~~/server/db/schema'
import { ensureProjectOwner } from '~~/server/utils/projects'
import {eq} from "drizzle-orm";

const ParamsSchema = z.object({ imageId: z.coerce.number().int().min(1) })

export default defineEventHandler(async (event) => {
  const params = getRouterParams(event)
  const parsed = ParamsSchema.safeParse(params)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image id', data: parsed.error.flatten() })
  }
  const imageId = parsed.data.imageId

  const db = getDb()
  const row = await db.query.projectImages.findFirst({ where: (pi, { eq }) => eq(pi.id, imageId) })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Image not found' })

  // Ensure the caller is the owner of the project
  await ensureProjectOwner(event, row.projectId)

  await db.delete(projectImages).where(eq(projectImages.id, imageId))
  return { ok: true }
})
