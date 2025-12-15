import { z } from 'zod'
import { getDb } from '~~/server/db/client'
import { users } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth, verifyPassword, hashPassword } from '~~/server/utils/auth'

const BodySchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit faire au moins 8 caractères').max(128),
  confirmPassword: z.string().min(1),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'La confirmation ne correspond pas',
  path: ['confirmPassword']
})

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const body = await readBody(event)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Corps invalide', data: parsed.error.flatten() })
  }
  const { currentPassword, newPassword } = parsed.data

  const db = getDb()
  const id = Number(session.sub)
  const query = db.query
  if (!('users' in query)) return query

  const user = await query.users.findFirst({ where: eq(users.id, id) })
  if (!user) throw createError({ statusCode: 404, statusMessage: 'Utilisateur introuvable' })

  const ok = await verifyPassword(user.passwordHash, currentPassword)
  if (!ok) throw createError({ statusCode: 400, statusMessage: 'Mot de passe actuel incorrect' })

  const newHash = await hashPassword(newPassword)
  await db.update(users)
    .set({ passwordHash: newHash as any, updatedAt: new Date() as any })
    .where(eq(users.id, user.id))

  return { ok: true }
})
