import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { projects, projectImages } from '~~/server/db/schema'
import { requireAuth } from '~~/server/utils/auth'
import { getProjectWithTags, setProjectTags } from '~~/server/utils/projects'
import { savedSearches, users } from '~~/server/db/schema'
import { sendNewProjectAlert } from '~~/server/utils/mail'
import {inArray} from "drizzle-orm";

const FieldsSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  // comma-separated tags provided via text field
  tags: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = getDb()
  const form = await readMultipartFormData(event)
  if (!form) {
    throw createError({ statusCode: 400, statusMessage: 'Expected multipart/form-data' })
  }

  const fields: Record<string, string> = {}
  let filePart: { filename?: string; type?: string; data: Buffer } | null = null
  type ImgPart = { filename?: string; type?: string; data: Buffer }
  const images: ImgPart[] = []
  for (const part of form) {
    // Nitro multipart parts: file parts have part.type === 'file'
    if (part.name === 'file' || part.name === 'images') {
      // @ts-ignore - Nitro returns data as Buffer
      const fp = { filename: part.filename, type: part.type, data: part.data } as any
      // Decide if this is the ZIP or an image based on the filename
      const fname = (fp.filename || '').toLowerCase()
      if (fname.endsWith('.zip') || (part.name === 'file')) {
        filePart = fp
      } else {
        images.push(fp)
      }
    } else if (part.name) {
      fields[part.name] = String(part.data)
    }
  }

  const parsed = FieldsSchema.safeParse(fields)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid fields', data: parsed.error.flatten() })
  }
  const { name, description, tags } = parsed.data

  if (!filePart) {
    throw createError({ statusCode: 400, statusMessage: 'Le fichier zip est requis' })
  }
  const filename = filePart.filename || 'project.zip'
  // Basic ZIP validation by extension and minimal signature if available
  if (!filename.toLowerCase().endsWith('.zip')) {
    throw createError({ statusCode: 400, statusMessage: 'Le fichier doit être un .zip' })
  }

  // Validate and limit images (optional, up to 4)
  const ACCEPTED_TYPES = new Set([ 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp' ])
  const imageInserts: { projectId: number; fileName: string; fileType: string; fileSize: number; fileData: Buffer }[] = []
  if (images.length > 0) {
    if (images.length > 4) {
      throw createError({ statusCode: 400, statusMessage: 'Maximum 4 images par envoi' })
    }
    for (const img of images) {
      const name = img.filename || 'image'
      let mime = ''
      const lower = name.toLowerCase()
      // Nitro may not provide a mime; infer from extension
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg'
      else if (lower.endsWith('.png')) mime = 'image/png'
      else if (lower.endsWith('.gif')) mime = 'image/gif'
      else if (lower.endsWith('.webp')) mime = 'image/webp'
      if (!mime || !ACCEPTED_TYPES.has(mime)) {
        throw createError({ statusCode: 400, statusMessage: `Type d'image non supporté (${mime || 'inconnu'})` })
      }
      const size = (img.data as any).length
      if (size <= 0) continue
      // projectId not known yet; will assign after project insert
      imageInserts.push({ projectId: 0, fileName: name, fileType: mime, fileSize: size, fileData: img.data as any })
    }
  }

  await db.insert(projects).values({
    userId: Number(session.sub),
    name,
    description,
    fileName: filename,
    fileType: 'application/zip',
    fileSize: (filePart.data as any).length,
    fileData: filePart.data as any,
  })

  const created = await db.query.projects.findFirst({
    where: (p, { and, eq }) => and(eq(p.userId, Number(session.sub)), eq(p.name, name)),
    orderBy: (p, { desc }) => [desc(p.id)],
  })
  if (!created) throw createError({ statusCode: 500, statusMessage: 'Failed to create project' })

  const tagArray = (tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  if (tagArray.length) {
    await setProjectTags(created.id, tagArray)
  }

  // Insert images if any were provided
  if (imageInserts.length > 0) {
    const values = imageInserts.map((v) => ({ ...v, projectId: created.id }))
    await db.insert(projectImages).values(values)
  }

  // Notifications d'alerte de recherche (best effort, sans bloquer la création)
  try {
    const project = await getProjectWithTags(created.id)
    const projNameLc = (project?.name || '').toLowerCase()
    const projTagsLc = new Set((project?.tags || []).map(t => t.toLowerCase()))
    // Récupérer toutes les recherches sauvegardées (idéalement filtrer côté SQL si volumétrie)
    const allAlerts = await db.select().from(savedSearches)
    // Ne pas notifier l'auteur du projet pour ses propres alertes
    const matched = allAlerts.filter(a => {
      if (a.userId === created.userId) return false
      if (a.type === 'project') return projNameLc.includes(a.query)
      if (a.type === 'tag') return projTagsLc.has(a.query)
      return false
    })
    if (matched.length) {
      // Grouper par user
      const byUser = new Map<number, { type: 'project'|'tag', query: string }[]>()
      for (const m of matched) {
        const list = byUser.get(m.userId) || []
        list.push({ type: m.type as any, query: m.query })
        byUser.set(m.userId, list)
      }
      // Récupérer emails
      const userIds = Array.from(byUser.keys())
      if (userIds.length) {
        const rows = await db.select().from(users).where(inArray(users.id, userIds))
        const emailMap = new Map(rows.map(r => [r.id, r.email]))
        for (const [uid, queries] of byUser.entries()) {
          const to = emailMap.get(uid)
          if (!to) continue
          // Envoyer un mail par requête sauvegardée (simple et clair)
          for (const q of queries) {
            await sendNewProjectAlert(to, {
              projectId: created.id,
              projectName: project?.name || '',
              query: q.query,
              type: q.type,
            })
          }
        }
      }
    }
  } catch (e) {
    // ne pas faire échouer la création si l'envoi mail échoue
    console.error('search alert notification failed', e)
  }

  return await getProjectWithTags(created.id)
})
