import { and, eq, inArray, sql } from 'drizzle-orm'
import { getDb } from '~~/server/db/client'
import { projectFavorites, projects, projectTags, tags, users, projectImages, userAvatars, type Project } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'

type FavItem = Project & {
  tags: string[]
  hasFile: boolean
  coverImageId: string | null
  creatorUsername?: string
  creatorHasAvatar?: boolean
  creatorAvatarUrl?: string | null,
  isFavorite: boolean
}

export default defineEventHandler(async (event): Promise<{ items: FavItem[] }> => {
  const session = await requireAuth(event)
  const userId = Number(session.sub)
  const db = getDb()

  // Get favorite project IDs for this user
  const favRows = await db
    .select({ projectId: projectFavorites.projectId })
    .from(projectFavorites)
    .where(eq(projectFavorites.userId, userId))

  const ids = favRows.map((r) => Number(r.projectId))
  if (ids.length === 0) return { items: [] }

  // Fetch projects (public or owned by someone else; a favori peut exister même si privé, on liste seulement s'il est public)
  const projRows = await db
    .select()
    .from(projects)
    .where(inArray(projects.id, ids))

  const visible = projRows.filter((p) => p.isPublic === 1 || p.userId === userId)
  if (visible.length === 0) return { items: [] }

  const visIds = visible.map((p) => p.id)
  const creators = Array.from(new Set(visible.map((p) => p.userId)))

  // Tags per project
  const tagsByProject = new Map<number, string[]>()
  const pts = await db
    .select()
    .from(projectTags)
    .leftJoin(tags, eq(projectTags.tagId, tags.id))
    .where(inArray(projectTags.projectId, visIds))
  for (const row of pts) {
    if (!row.tags) continue
    const arr = tagsByProject.get(row.project_tags.projectId) || []
    arr.push(row.tags.name)
    tagsByProject.set(row.project_tags.projectId, arr)
  }

  // Cover image id
  const coverRows = await db
    .select({ projectId: projectImages.projectId, coverImageId: sql<number>`min(${projectImages.id})` })
    .from(projectImages)
    .where(inArray(projectImages.projectId, visIds))
    .groupBy(projectImages.projectId)
  const coverByProject = new Map<number, number>()
  for (const r of coverRows) {
    if (r.coverImageId) coverByProject.set(Number(r.projectId), Number(r.coverImageId))
  }

  // Creators usernames and avatars
  const usernameByUserId = new Map<number, string>()
  const hasAvatarByUserId = new Map<number, boolean>()
  if (creators.length) {
    const userRows = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(inArray(users.id, creators))
    for (const u of userRows) usernameByUserId.set(Number(u.id), u.username)
    const avaRows = await db
      .select({ userId: userAvatars.userId })
      .from(userAvatars)
      .where(inArray(userAvatars.userId, creators))
    for (const a of avaRows) hasAvatarByUserId.set(Number(a.userId), true)
  }

  const items: FavItem[] = visible.map<FavItem>(p => ({
    id: p.id,
    userId: p.userId,
    name: p.name,
    description: p.description,
    hasFile: Boolean(p.fileName && p.fileSize),
    fileName: p.fileName,
    fileSize: p.fileSize,
    createdAt: p.createdAt,
    tags: tagsByProject.get(p.id) || [],
    // @ts-ignore
    coverImageId: coverByProject.get(p.id) || null,
    creatorUsername: usernameByUserId.get(p.userId) || undefined,
    creatorHasAvatar: hasAvatarByUserId.get(p.userId) || false,
    creatorAvatarUrl: hasAvatarByUserId.get(p.userId) ? `/api/users/${p.userId}/avatar` : null,
    isFavorite: !!favRows.find(r => r.projectId === p.id),
  })) as FavItem[]

  return { items }
})
