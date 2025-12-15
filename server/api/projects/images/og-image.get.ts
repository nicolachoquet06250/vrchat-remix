import { z } from 'zod'
import sharp from 'sharp'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { getDb } from '~~/server/db/client'
import { getSession } from '~~/server/utils/auth'

const QuerySchema = z.object({ id: z.coerce.number().int().min(1) })

function mimeToSharpFormat(mime?: string | null): keyof sharp.FormatEnum {
  if (!mime) return 'png'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpeg'
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('avif')) return 'avif'
  return 'png'
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const parsed = QuerySchema.safeParse(query)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image id', data: parsed.error.flatten() })
  }

  const imageId = parsed.data.id
  const db = getDb()
  const row = await db.query.projectImages.findFirst({ where: (pi, { eq }) => eq(pi.id, imageId) })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  // Access control: ensure parent project is public or requester is owner
  const proj = await db.query.projects.findFirst({ where: (p, { eq }) => eq(p.id, row.projectId) })
  if (!proj) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  if (!(proj as any).isPublic) {
    const session = await getSession(event)
    if (!session || Number(session.sub) !== (proj as any).userId) {
      throw createError({ statusCode: 404, statusMessage: 'Image not found' })
    }
  }
  const data = (row as any).fileData as Buffer | null
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Image data missing' })

  // Read the app logo from /public/vrchat-remix.png
  const logoPath = path.join(process.cwd(), 'public', 'vrchat-remix.png')
  let logoBuf: Buffer
  try {
    logoBuf = await fs.readFile(logoPath)
  } catch (e) {
    throw createError({ statusCode: 500, statusMessage: 'Logo not found on server' })
  }

  // Prepare base image and get dimensions (rotate() to honor EXIF orientation)
  // We rotate first, then perform a top-origin square crop.
  let base = sharp(data, { failOn: 'none' }).rotate()
  const rotMeta = await base.metadata()
  const rotW = rotMeta.width || 0
  const rotH = rotMeta.height || 0
  if (!rotW || !rotH) {
    throw createError({ statusCode: 415, statusMessage: 'Unsupported or invalid image' })
  }

  // Compute a top-origin square crop box
  const size = Math.min(rotW, rotH)
  const extractLeft = rotW > rotH ? Math.floor((rotW - size) / 2) : 0
  const extractTop = 0 // crop starting from top
  base = base.extract({ left: extractLeft, top: extractTop, width: size, height: size })

  // Compute logo target size (e.g., 14% of cropped width) and margin (in pixels)
  const margin = Math.max(8, Math.round(size * 0.02))
  const logoTargetW = Math.max(32, Math.round(size * 0.14))

  // Resize the logo preserving aspect ratio, then pad it to create a margin from edges
  const logoResized = sharp(logoBuf).resize({ width: logoTargetW, withoutEnlargement: true })
  const logoResizedBuf = await logoResized.png().toBuffer()
  const paddedLogoBuf = await sharp(logoResizedBuf)
    .extend({ top: 0, left: 0, right: margin, bottom: margin, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const fmt = mimeToSharpFormat(row.fileType)
  const out = await base
    .composite([{ input: paddedLogoBuf, gravity: 'southeast' }])
    .toFormat(fmt)
    .toBuffer()

  setResponseHeader(event, 'Content-Type', row.fileType || 'image/png')
  setResponseHeader(event, 'Content-Length', out.length)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')
  return out
})
