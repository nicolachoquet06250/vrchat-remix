import { eq, inArray } from 'drizzle-orm'
import { getDb } from '~~/server/db/client'
import {type Project, projectTags, tags} from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'

export async function ensureProjectOwner(event: any, projectId: number) {
  const session = await requireAuth(event)
  const db = getDb()
  const query = db.query;
  if ('projects' in query) {
    const proj = await query.projects.findFirst({where: (p, {eq}) => eq(p.id, projectId)})
    if (!proj) throw createError({statusCode: 404, statusMessage: 'Project not found'})
    if (proj.userId !== Number(session.sub)) throw createError({statusCode: 403, statusMessage: 'Forbidden'})
    return {session, proj}
  }
  return {session, proj: query}
}

export async function getProjectWithTags(projectId: number): Promise<Project & {tags: string[], hasFile: boolean} | null> {
  const db = getDb()
  const proj = await db.query.projects.findFirst({ where: (p, { eq }) => eq(p.id, projectId) })
  if (!proj) return null
  const pts = await db
    .select()
    .from(projectTags)
    .leftJoin(tags, eq(projectTags.tagId, tags.id))
    .where(eq(projectTags.projectId, projectId))
  const tagList = pts.map((r) => r.tags?.name).filter(Boolean) as string[]
  // Ne pas renvoyer le blob; exposer un indicateur et les métadonnées seulement
  const { fileData, ...rest } = proj as any
  return { ...rest, hasFile: Boolean(proj.fileName && proj.fileSize), tags: tagList } as Project & {tags: string[], hasFile: boolean}
}

export async function setProjectTags(projectId: number, tagNames: string[]) {
  const db = getDb()
  // normalize lower-case unique
  const normalized = Array.from(new Set(tagNames.map((t) => t.trim().toLowerCase()).filter(Boolean)))
  if (normalized.length === 0) {
    // remove all tags
    await db.delete(projectTags).where(eq(projectTags.projectId, projectId))
    return []
  }
  const existing = await db.select().from(tags).where(inArray(tags.name, normalized))
  const existingMap = new Map(existing.map((t) => [t.name, t.id]))
  const toCreate = normalized.filter((n) => !existingMap.has(n))
  if (toCreate.length > 0) {
    await db.insert(tags).values(toCreate.map((name) => ({ name })))
  }
  const all = await db.select().from(tags).where(inArray(tags.name, normalized))
  const allIds = all.map((t) => t.id)

  // reset links
  await db.delete(projectTags).where(eq(projectTags.projectId, projectId))
  if (allIds.length > 0) {
    await db.insert(projectTags).values(allIds.map((tagId) => ({ projectId, tagId })))
  }
  return normalized
}
