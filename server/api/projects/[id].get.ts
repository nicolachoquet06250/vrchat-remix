import { z } from 'zod'
import { getProjectWithTags } from '~~/server/utils/projects'

const ParamsSchema = z.object({ id: z.coerce.number().int().min(1) })

export default defineEventHandler(async (event) => {
  const params = getRouterParams(event)
  const parsed = ParamsSchema.safeParse(params)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id', data: parsed.error.flatten() })
  }
  const id = parsed.data.id
  const proj = await getProjectWithTags(id)
  if (!proj) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  return proj
})
