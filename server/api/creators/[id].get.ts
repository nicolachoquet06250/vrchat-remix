import { and, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { projects, projectImages, projectTags, tags, userAvatars, users, type Project } from '~~/server/db/schema'

export type Creator = {
  user: {
    id: number,
    username: string,
    hasAvatar: boolean,
    avatarUrl: string | null,
  },
  items: CreatorProject[],
  total: number,
  page: number,
  pageSize: number,
}

const ParamsSchema = z.object({ id: z.coerce.number().int().min(1) })
const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

type CreatorProject = Project & {
  tags: string[]
  coverImageId: number | null
}

export default defineEventHandler(async (event): Promise<{
  user: { id: number, username: string, hasAvatar: boolean, avatarUrl: string | null } | null,
  items: CreatorProject[],
  total: number,
  page: number,
  pageSize: number,
}> => {
  const params = getRouterParams(event)
  const qp = getQuery(event)
  const parsedParams = ParamsSchema.safeParse(params)
  const parsedQuery = QuerySchema.safeParse(qp)
  if (!parsedParams.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user id', data: parsedParams.error.flatten() })
  }
  if (!parsedQuery.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid query', data: parsedQuery.error.flatten() })
  }
  const { id } = parsedParams.data
  const { page, pageSize } = parsedQuery.data

  const db = getDb()

  // Fetch user profile basics
  const userRow = await db.select({ id: users.id, username: users.username }).from(users).where(eq(users.id, id)).limit(1)
  const user = userRow[0]
  if (!user) throw createError({ statusCode: 404, statusMessage: 'Creator not found' })

  const ava = await db.select({ userId: userAvatars.userId }).from(userAvatars).where(eq(userAvatars.userId, id)).limit(1)
  const hasAvatar = !!ava[0]

  // Only public projects for this user
  const whereClause = and(eq(projects.userId, id), eq(projects.isPublic, 1 as any))

  const totalRows = await db.select({ count: sql<number>`COUNT(*)` }).from(projects).where(whereClause)
  const total = Number(totalRows[0]?.count ?? 0)
  const offset = (page - 1) * pageSize

  const rows = await db.select().from(projects)
    .where(whereClause)
    .orderBy(projects.createdAt)
    .limit(pageSize)
    .offset(offset)

  const ids = rows.map(r => r.id)
  let tagsByProject = new Map<number, string[]>()
  let coverByProject = new Map<number, number>()

  if (ids.length) {
    const pts = await db.select().from(projectTags)
      .leftJoin(tags, eq(projectTags.tagId, tags.id))
      .where(inArray(projectTags.projectId, ids))
    for (const row of pts) {
      if (!row.tags) continue
      const arr = tagsByProject.get(row.project_tags.projectId) || []
      arr.push(row.tags.name)
      tagsByProject.set(row.project_tags.projectId, arr)
    }

    const coverRows = await db
      .select({ projectId: projectImages.projectId, coverImageId: sql<number>`min(${projectImages.id})` })
      .from(projectImages)
      .where(inArray(projectImages.projectId, ids))
      .groupBy(projectImages.projectId)

    for (const r of coverRows) {
      if (r.coverImageId) coverByProject.set(r.projectId as number, Number(r.coverImageId))
    }
  }

  const items = rows.map((p: any) => ({
    ...p,
    tags: tagsByProject.get(p.id) || [],
    coverImageId: coverByProject.get(p.id) || null,
  })) as any as CreatorProject[]

  return {
    user: {
      id: Number(user.id),
      username: user.username,
      hasAvatar,
      avatarUrl: hasAvatar ? `/api/users/${id}/avatar` : null,
    },
    items,
    total,
    page,
    pageSize,
  } as Creator;
})