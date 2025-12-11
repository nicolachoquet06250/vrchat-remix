import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { projectImages, projects } from '~~/server/db/schema'
import { ensureProjectOwner } from '~~/server/utils/projects'
import {eq} from "drizzle-orm";

const ParamsSchema = z.object({ id: z.coerce.number().int().min(1) })

const ACCEPTED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
])

export default defineEventHandler(async (event) => {
  const params = getRouterParams(event)
  const parsed = ParamsSchema.safeParse(params)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id', data: parsed.error.flatten() })
  }
  const projectId = parsed.data.id

  await ensureProjectOwner(event, projectId)

  const form = await readMultipartFormData(event)
  if (!form) {
    throw createError({ statusCode: 400, statusMessage: 'Formdata required' })
  }

  // Collect up to 4 files from parts named 'images' or any file parts
  type FilePart = { filename?: string; type?: string; data: Buffer }
  const files: FilePart[] = []
  for (const part of form) {
    if (part.type === 'file') {
      // @ts-ignore
      const filePart: FilePart = { filename: part.filename, type: part.type, data: part.data }
      files.push(filePart)
    }
  }
  if (files.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Aucune image fournie' })
  }
  if (files.length > 4) {
    throw createError({ statusCode: 400, statusMessage: 'Maximum 4 images par envoi' })
  }

  const db = getDb()
  const inserts: any[] = []
  for (const f of files) {
    const name = f.filename || 'image'
    // try to infer type from filename if missing
    let mime = f.type || ''
    const lower = name.toLowerCase()
    if (!mime) {
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg'
      else if (lower.endsWith('.png')) mime = 'image/png'
      else if (lower.endsWith('.gif')) mime = 'image/gif'
      else if (lower.endsWith('.webp')) mime = 'image/webp'
    }
    if (!mime || !ACCEPTED_TYPES.has(mime)) {
      throw createError({ statusCode: 400, statusMessage: `Type d'image non supporté (${mime || 'inconnu'})` })
    }
    const size = (f.data as any).length
    if (size <= 0) continue
    inserts.push({ projectId, fileName: name, fileType: mime, fileSize: size, fileData: f.data as any })
  }
  if (inserts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Aucune image valide' })
  }
  await db.insert(projectImages).values(inserts)

  // return new list metadata
  const rows = await db
    .select({ id: projectImages.id, fileName: projectImages.fileName, fileType: projectImages.fileType, fileSize: projectImages.fileSize, createdAt: projectImages.createdAt })
    .from(projectImages)
    .where(eq(projectImages.projectId, projectId))
  return rows
})
