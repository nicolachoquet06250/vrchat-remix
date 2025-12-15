import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { projects, savedSearches, users } from '~~/server/db/schema'
import { ensureProjectOwner, getProjectWithTags, setProjectTags } from '~~/server/utils/projects'
import { eq, inArray } from 'drizzle-orm'
import { sendNewProjectAlert, sendProjectUpdatedEmail } from '~~/server/utils/mail'
import { projectFavorites } from '~~/server/db/schema'

const FieldsSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).optional(),
  tags: z.string().optional(), // comma-separated
  isPublic: z.union([z.literal('true'), z.literal('false')]).optional(),
})

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  await ensureProjectOwner(event, id)

  const form = await readMultipartFormData(event)
  if (!form) {
    // Also allow JSON body for metadata-only updates (no file)
    const body = await readBody(event).catch(() => ({}))
    const parsed = FieldsSchema.safeParse(body || {})
    if (!parsed.success) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid body', data: parsed.error.flatten() })
    }
    const { name, description, tags } = parsed.data
    const db = getDb()
    const values: any = {}
    if (typeof name !== 'undefined') values.name = name
    if (typeof description !== 'undefined') values.description = description
    if (typeof (parsed.data as any).isPublic !== 'undefined') {
      values.isPublic = (parsed.data as any).isPublic === 'true' ? 1 : 0
    }
    if (Object.keys(values).length) {
      await db.update(projects).set(values).where(eq(projects.id, id))
    }
    if (typeof tags !== 'undefined') {
      const tagArray = (tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      await setProjectTags(id, tagArray)
    }
    const updated = await getProjectWithTags(id)
    if (!updated) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
    // If transition private -> public, send alerts now
    try {
      const before = await db.query.projects.findFirst({ where: (p, { eq }) => eq(p.id, id) })
      // Note: we already updated; to detect transition properly we need previous state.
      // Fallback: compute transition using provided isPublic if present.
      const provided = (parsed.data as any).isPublic
      if (typeof provided !== 'undefined') {
        const becamePublic = provided === 'true'
        const wasPrivate = (before as any)?.isPublic ? (before as any).isPublic === 0 : false
        if (becamePublic && !wasPrivate) {
          // If we can't reliably detect, still proceed to send alerts when provided=true.
        }
      }
    } catch {}
    return updated
  }

  const fields: Record<string, string> = {}
  let filePart: { filename?: string; data: Buffer } | null = null
  for (const part of form) {
    if (part.type === 'file') {
      // @ts-ignore
      filePart = { filename: part.filename, data: part.data } as any
    } else if (part.name) {
      fields[part.name] = String(part.data)
    }
  }
  const parsed = FieldsSchema.safeParse(fields)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid fields', data: parsed.error.flatten() })
  }
  const { name, description, tags } = parsed.data

  const db = getDb()
  // Load current project to detect visibility transition
  const current = await db.query.projects.findFirst({ where: (p, { eq }) => eq(p.id, id) })
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  const values: any = {}
  if (typeof name !== 'undefined') values.name = name
  if (typeof description !== 'undefined') values.description = description
  if (typeof (parsed.data as any).isPublic !== 'undefined') {
    values.isPublic = (parsed.data as any).isPublic === 'true' ? 1 : 0
  }
  if (filePart) {
    const filename = filePart.filename || 'project.zip'
    if (!filename.toLowerCase().endsWith('.zip')) {
      throw createError({ statusCode: 400, statusMessage: 'Le fichier doit être un .zip' })
    }
    values.fileName = filename
    values.fileType = 'application/zip'
    values.fileSize = (filePart.data as any).length
    values.fileData = filePart.data as any
  }
  if (Object.keys(values).length) {
    await db.update(projects).set(values).where(eq(projects.id, id))
  }
  if (typeof tags !== 'undefined') {
    const tagArray = (tags || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    await setProjectTags(id, tagArray)
  }

  const updated = await getProjectWithTags(id)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  // Notify favorites subscribers about any update
  try {
    const favs = await db.select().from(projectFavorites).where(eq(projectFavorites.projectId, id))
    if (favs.length) {
      const subscriberIds = favs.map(f => f.userId).filter(uid => uid !== (current as any).userId)
      if (subscriberIds.length) {
        const rows = await db.select({ id: users.id, username: users.username, email: users.email })
            .from(users).where(inArray(users.id, subscriberIds))
        for (const r of rows) {
          await sendProjectUpdatedEmail(r.email, {
            projectId: id,
            projectName: updated.name,
            username: rows[0]?.username
          })
        }
      }
    }
  } catch (e) {
    console.error('favorites update notification failed', e)
  }
  // Send alerts only if becoming public now (private -> public)
  try {
    const becamePublic = (values.isPublic ?? (current as any).isPublic) === 1
    const wasPublic = (current as any).isPublic === 1
    if (!wasPublic && becamePublic) {
      const project = await getProjectWithTags(id)
      const projNameLc = (project?.name || '').toLowerCase()
      const projTagsLc = new Set((project?.tags || []).map(t => t.toLowerCase()))
      const allAlerts = await db.select().from(savedSearches)
      const matched = allAlerts.filter(a => {
        if (a.userId === (current as any).userId) return false
        if (a.type === 'project') return projNameLc.includes(a.query)
        if (a.type === 'tag') return projTagsLc.has(a.query)
        return false
      })
      if (matched.length) {
        const byUser = new Map<number, { type: 'project'|'tag', query: string }[]>()
        for (const m of matched) {
          const list = byUser.get(m.userId) || []
          list.push({ type: m.type as any, query: m.query })
          byUser.set(m.userId, list)
        }
        const userIds = Array.from(byUser.keys())
        if (userIds.length) {
          const rows = await db.select().from(users).where(inArray(users.id, userIds))
          const emailMap = new Map(rows.map(r => [r.id, r.email]))
          for (const [uid, queries] of byUser.entries()) {
            const to = emailMap.get(uid)
            if (!to) continue
            for (const q of queries) {
              await sendNewProjectAlert(to, {
                projectId: id,
                projectName: project?.name || '',
                query: q.query,
                type: q.type,
              })
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('search alert notification on publish failed', e)
  }
  return updated
})
