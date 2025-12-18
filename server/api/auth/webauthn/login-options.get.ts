import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { getDb } from '~~/server/db/client'
import { users } from '~~/server/db/schema'
import { eq, or } from 'drizzle-orm'
import { getWebAuthnConfig } from '~~/server/utils/webauthn'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const emailOrUsername = query.username as string
  const { rpID } = getWebAuthnConfig(event)

  const db = getDb()
  const user = await db.query.users.findFirst({
    where: or(eq(users.email, emailOrUsername), eq(users.username, emailOrUsername)),
    with: {
      authenticators: true
    }
  })

  // @ts-ignore
  const userAuthenticators = user?.authenticators || []

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: userAuthenticators.map((auth: any) => ({
      id: auth.id,
      type: 'public-key',
      transports: auth.transports?.split(',') || [],
    })),
    userVerification: 'preferred',
  })

  setCookie(event, 'webauthn_auth_challenge', options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 5, // 5 minutes
    path: '/',
  })

  if (user) {
    setCookie(event, 'webauthn_auth_user_id', String(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5,
      path: '/',
    })
  }

  return options
})
