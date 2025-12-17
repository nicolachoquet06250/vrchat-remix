import { and, eq, inArray, like, sql } from 'drizzle-orm'
import { getDb } from '~~/server/db/client'
import {projects, projectTags, tags, users, projectImages, userAvatars, projectFavorites, type Project} from '~~/server/db/schema'
import { z } from 'zod'
import { getSession } from '~~/server/utils/auth'

const QuerySchema = z.object({
  q: z.string().max(200).optional(),
  tag: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  mineOnly: z.coerce.boolean().optional().default(false),
})

type PaginationItem = Project & {
  tags: string[]
  hasFile: boolean
  coverImageId: string | null
  creatorUsername?: string
  creatorHasAvatar?: boolean
  creatorAvatarUrl?: string | null
  isFavorite?: boolean
};

export default defineEventHandler(async (event): Promise<{
  items: PaginationItem[],
  total: number,
  page: number,
  pageSize: number
}> => {
  const query = getQuery(event)
  const parsed = QuerySchema.safeParse(query)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid query', data: parsed.error.flatten() })
  }
  const { q, tag, page, pageSize, mineOnly } = parsed.data
  const db = getDb()

  // Base filtering
  const whereClauses: any[] = []
  if (q) {
    whereClauses.push(like(projects.name, `%${q}%`))
  }

  let projectIdsByTag: number[] | null = null
  if (tag) {
    const query = db.query;
    if ('tags' in query) {
      const tagRow = await query.tags.findFirst({
        where: eq(tags.name, tag.toLowerCase())
      })
      if (!tagRow) {
        return {items: [], total: 0, page, pageSize}
      }
      const links = await db.select().from(projectTags).where(eq(projectTags.tagId, tagRow.id))
      projectIdsByTag = links.map((l) => l.projectId)
      if (projectIdsByTag.length === 0) {
        return {items: [], total: 0, page, pageSize}
      }
      whereClauses.push(inArray(projects.id, projectIdsByTag))
    }
  }

  // Visibility & ownership
  if (mineOnly) {
    const session = await getSession(event)
    if (session) {
      // Only my projects (public and private)
      whereClauses.push(eq(projects.userId, Number(session.sub)))
    } else {
      // Not authenticated: fall back to public listing
      whereClauses.push(eq(projects.isPublic, 1 as any))
    }
  } else {
    // Public listing/search only
    whereClauses.push(eq(projects.isPublic, 1 as any))
  }

  const offset = (page - 1) * pageSize

  const totalRows = await db.select({ count: sql<number>`COUNT(*)` }).from(projects).where(
    whereClauses.length ? and(...whereClauses) : undefined as any,
  )
  const total = Number(totalRows[0]?.count ?? 0)

  const rows = await db.select().from(projects)
    .where(whereClauses.length ? and(...whereClauses) : undefined as any)
    .orderBy(projects.createdAt)
    .limit(pageSize)
    .offset(offset)

  const ids = rows.map(r => r.id)
  const userIds = Array.from(new Set(rows.map(r => r.userId)))
  let tagsByProject = new Map<number, string[]>()
  let coverByProject = new Map<number, number>()
  let usernameByUserId = new Map<number, string>()
  let hasAvatarByUserId = new Map<number, boolean>()
  let favoriteSet = new Set<number>()
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

    // Compute a cover image id for each project (first image by id)
    const coverRows = await db
      .select({
        projectId: projectImages.projectId,
        coverImageId: sql<number>`min(${projectImages.id})`,
      })
      .from(projectImages)
      .where(inArray(projectImages.projectId, ids))
      .groupBy(projectImages.projectId)

    for (const r of coverRows) {
      if (r.coverImageId) coverByProject.set(r.projectId as number, Number(r.coverImageId))
    }

    // Fetch creators usernames in batch
    if (userIds.length) {
      const userRows = await db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, userIds))
      for (const u of userRows) usernameByUserId.set(Number(u.id), u.username)

      // Fetch avatars existence in batch (without blobs)
      const avaRows = await db.select({ userId: userAvatars.userId }).from(userAvatars).where(inArray(userAvatars.userId, userIds))
      for (const a of avaRows) hasAvatarByUserId.set(Number(a.userId), true)
    }

    // Fetch favorites for current user if authenticated
    const session = await getSession(event)
    if (session) {
      const favRows = await db.select({ projectId: projectFavorites.projectId })
        .from(projectFavorites)
        .where(
          and(
            eq(projectFavorites.userId, Number(session.sub)),
            inArray(projectFavorites.projectId, ids)
          )
        )
      for (const r of favRows) favoriteSet.add(Number(r.projectId))
    }
  }

  const items = rows.map((p: any) => ({
    id: p.id,
    userId: p.userId,
    name: p.name,
    description: p.description,
    hasFile: Boolean(p.fileName && p.fileSize),
    fileName: p.fileName,
    fileSize: p.fileSize,
    createdAt: p.createdAt,
    tags: tagsByProject.get(p.id) || [],
    coverImageId: coverByProject.get(p.id) || null,
    creatorUsername: usernameByUserId.get(p.userId) || undefined,
    creatorHasAvatar: hasAvatarByUserId.get(p.userId) || false,
    creatorAvatarUrl: hasAvatarByUserId.get(p.userId) ? `/api/users/${p.userId}/avatar` : null,
    isFavorite: favoriteSet.has(Number(p.id)),
  }))

  return { items: items as PaginationItem[], total, page, pageSize }
})
