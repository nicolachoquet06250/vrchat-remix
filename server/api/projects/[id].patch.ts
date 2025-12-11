import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { projects } from '~~/server/db/schema'
import { ensureProjectOwner, getProjectWithTags, setProjectTags } from '~~/server/utils/projects'
import {eq} from "drizzle-orm";

const FieldsSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).optional(),
  tags: z.string().optional(), // comma-separated
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
  const values: any = {}
  if (typeof name !== 'undefined') values.name = name
  if (typeof description !== 'undefined') values.description = description
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
  return updated
})
