import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { downloads } from '~~/server/db/schema'
import { getSession } from '~~/server/utils/auth'

const ParamsSchema = z.object({ id: z.coerce.number().int().min(1) })

export default defineEventHandler(async (event) => {
  const params = getRouterParams(event)
  const parsed = ParamsSchema.safeParse(params)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id', data: parsed.error.flatten() })
  }
  const id = parsed.data.id
  const db = getDb()
  const proj = await db.query.projects.findFirst({ where: (p, { eq }) => eq(p.id, id) })
  if (!proj) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  if (!(proj as any).isPublic) {
    const session = await getSession(event)
    if (!session || Number(session.sub) !== (proj as any).userId) {
      throw createError({ statusCode: 404, statusMessage: 'Project not found' })
    }
  }
  const anyProj: any = proj

  // Si un lien GitHub est présent, proxifier le zip GitHub
  if (anyProj.githubUrl) {
    try {
      const normalized = String(anyProj.githubUrl)
      const url = new URL(normalized)
      const parts = url.pathname.replace(/\.git$/,'').split('/').filter(Boolean)
      const owner = parts[0]
      const repo = parts[1]
      let ref: string | undefined
      const treeIdx = parts.indexOf('tree')
      if (treeIdx >= 0 && parts.length > treeIdx + 1) {
        ref = parts[treeIdx + 1]
      }
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/zipball` + (ref ? `/${encodeURIComponent(ref)}` : '')
      const resp = await fetch(apiUrl, { headers: { 'User-Agent': 'vrchat-remix-app' } as any })
      if (!resp.ok) {
        throw createError({ statusCode: 502, statusMessage: `Téléchargement GitHub échoué (${resp.status})` })
      }
      const buffer = Buffer.from(await resp.arrayBuffer())
      const filename = `${repo}${ref ? '-' + ref : ''}.zip`.replace(/[^A-Za-z0-9._-]/g, '_')
      setHeader(event, 'Content-Type', 'application/zip')
      setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

      // Log download analytics (best-effort)
      try {
        const session = await getSession(event)
        await db.insert(downloads).values({
          projectId: anyProj.id,
          userId: session ? Number(session.sub) : null,
          isAuthenticated: session ? 1 : 0,
        })
      } catch (e) {
        // ne pas bloquer le téléchargement en cas d'erreur d'analytics
      }

      return buffer
    } catch (e: any) {
      if (e?.statusCode) throw e
      throw createError({ statusCode: 502, statusMessage: 'Impossible de récupérer le zip depuis GitHub' })
    }
  }

  // Sinon, renvoyer le fichier stocké
  if (!anyProj.fileData || !anyProj.fileSize) {
    throw createError({ statusCode: 404, statusMessage: 'No file available' })
  }

  // Log download analytics (best-effort)
  try {
    const session = await getSession(event)
    await db.insert(downloads).values({
      projectId: anyProj.id,
      userId: session ? Number(session.sub) : null,
      isAuthenticated: session ? 1 : 0,
    })
  } catch (e) {
    // ne pas bloquer le téléchargement en cas d'erreur d'analytics
  }

  setHeader(event, 'Content-Type', anyProj.fileType || 'application/zip')
  const filename = (anyProj.fileName || 'project.zip').replace(/[^A-Za-z0-9._-]/g, '_')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

  return anyProj.fileData as Buffer
})
