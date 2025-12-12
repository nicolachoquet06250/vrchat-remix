import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { projectImages } from '~~/server/db/schema'
import {eq} from "drizzle-orm";

const ParamsSchema = z.object({ id: z.coerce.number().int().min(1) })

export default defineEventHandler(async (event) => {
  const params = getRouterParams(event)
  const parsed = ParamsSchema.safeParse(params)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id', data: parsed.error.flatten() })
  }
  const id = parsed.data.id
  const db = getDb()
  const rows = await db
    .select({ id: projectImages.id, fileName: projectImages.fileName, fileType: projectImages.fileType, fileSize: projectImages.fileSize, createdAt: projectImages.createdAt })
    .from(projectImages)
    .where(eq(projectImages.projectId, id))
  return rows.map(r => ({
    ...r,
    forCarousel: `/api/projects/images/carousel-image?id=${r.id}&d=${new Date().getTime()}`
  }))
})
