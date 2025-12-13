import {z} from 'zod'
import {getDb} from '~~/server/db/client'
import {userAvatars, users} from '~~/server/db/schema'
import {hashPassword} from '~~/server/utils/auth'
import {sendVerificationEmail} from '~~/server/utils/mail'
import {randomBytes} from 'node:crypto'

const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(128),
})

export default defineEventHandler(async (event) => {
  // Supporte JSON et multipart/form-data
  const contentType = getHeader(event, 'content-type') || ''
  let body: any = null
  let filePart: { filename?: string; type?: string; data: Buffer } | null = null

  if (contentType.includes('multipart/form-data')) {
    const form = await readMultipartFormData(event)
    if (!form) {
      throw createError({ statusCode: 400, statusMessage: 'Formdata required' })
    }
    // Extraire champs texte et un éventuel fichier "file"
    const fields: Record<string, string> = {}
    for (const part of form) {
      if ((part as any).type) {
        if (part.name === 'file') {
          // @ts-ignore
          filePart = { filename: (part as any).filename, type: (part as any).type, data: (part as any).data }
        }
      } else {
        // Champ texte → Buffer vers string
        fields[(part as any).name] = (part as any).data?.toString('utf8') || ''
      }
    }
    body = fields
  } else {
    body = await readBody(event)
  }

  const parsed = RegisterSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body', data: parsed.error.flatten() })
  }
  const { email, username, password } = parsed.data

  const db = getDb()

  const query = db.query;
  if ('users' in query) {
    const existing = await query.users.findFirst({
      where: (u, {eq, or}) => or(eq(u.email, email), eq(u.username, username)),
      columns: {id: true},
    })
    if (existing) {
      throw createError({statusCode: 409, statusMessage: 'Email or username already in use'})
    }

    const passwordHash = await hashPassword(password)
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48) // 48h
    await db.insert(users).values({
      email,
      username,
      passwordHash,
      verificationToken: token,
      verificationExpiresAt: expiresAt,
    })

    const created = await query.users.findFirst({where: (u, {eq}) => eq(u.email, email)})
    if (!created) throw createError({statusCode: 500, statusMessage: 'Failed to create user'})

    // Si un avatar a été fourni lors de l'inscription, l'enregistrer immédiatement
    if (filePart) {
      const ACCEPTED_TYPES = new Set([
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
      ])

      const name = filePart.filename || 'avatar'
      let mime = filePart.type || ''
      const lower = (name || '').toLowerCase()
      if (!mime) {
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg'
        else if (lower.endsWith('.png')) mime = 'image/png'
        else if (lower.endsWith('.gif')) mime = 'image/gif'
        else if (lower.endsWith('.webp')) mime = 'image/webp'
      }
      if (!mime || !ACCEPTED_TYPES.has(mime)) {
        // Avatar invalide → on ignore sans bloquer l'inscription
        console.warn('[register] avatar ignoré: type non supporté', mime)
      } else {
        const data = filePart.data as any as Buffer
        const size = (data as any).length
        if (!size || size <= 0) {
          console.warn('[register] avatar ignoré: image vide')
        } else {
          await db.insert(userAvatars).values({
            userId: created.id,
            fileName: name,
            fileType: mime,
            fileSize: size,
            // @ts-ignore
            fileData: data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).onDuplicateKeyUpdate({
            set: {
              fileName: name,
              fileType: mime,
              fileSize: size,
              // @ts-ignore
              fileData: data,
              updatedAt: new Date(),
            }
          })
        }
      }
    }

    // Send verification email (fire-and-forget)
    sendVerificationEmail(email, created.verificationToken!, username).catch((err) => {
      console.error('[mail] verification email failed', err)
    })

    // Do not create a session yet; require email verification first
    return { ok: true }
  }

  return query;
})
