import { generateRegistrationOptions } from '@simplewebauthn/server'
import { requireAuth } from '~~/server/utils/auth'
import { getDb } from '~~/server/db/client'
import { users } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { getWebAuthnConfig } from '~~/server/utils/webauthn'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const { rpID, rpName } = getWebAuthnConfig(event)
  const db = getDb()
  const user = await db.query.users.findFirst({
    where: eq(users.id, Number(session.sub)),
    with: {
      authenticators: true
    }
  })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  // @ts-ignore
  const userAuthenticators = user.authenticators || []

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: Buffer.from(String(user.id)),
    userName: user.username,
    attestationType: 'none',
    excludeCredentials: userAuthenticators.map((auth: any) => ({
      id: auth.id,
      type: 'public-key',
      transports: auth.transports?.split(',') || [],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  })

  // Store options in session for verification
  // Since we don't have a real session store besides the JWT cookie,
  // and we shouldn't bloat the JWT, we might need another way to store the challenge.
  // For now, let's use a temporary cookie for the challenge.
  setCookie(event, 'webauthn_registration_challenge', options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 5, // 5 minutes
  })

  return options
})
