import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { requireAuth } from '~~/server/utils/auth'
import { getDb } from '~~/server/db/client'
import { users, authenticators } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { getWebAuthnConfig } from '~~/server/utils/webauthn'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const body = await readBody(event)
  const expectedChallenge = getCookie(event, 'webauthn_registration_challenge')
  const { rpID, origin } = getWebAuthnConfig(event)

  if (!expectedChallenge) {
    throw createError({ statusCode: 400, statusMessage: 'Challenge not found or expired' })
  }

  const db = getDb()
  const user = await db.query.users.findFirst({
    where: eq(users.id, Number(session.sub))
  })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  })

  if (verification.verified && verification.registrationInfo) {
    const { registrationInfo } = verification
    const { id, publicKey, counter } = registrationInfo.credential
    const { credentialDeviceType, credentialBackedUp } = registrationInfo

    await db.insert(authenticators).values({
      id: id,
      userId: user.id,
      publicKey: Buffer.from(publicKey),
      counter: counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp ? 1 : 0,
      transports: body.response.transports?.join(','),
    })

    deleteCookie(event, 'webauthn_registration_challenge')
    return { ok: true }
  }

  throw createError({ statusCode: 400, statusMessage: 'Verification failed' })
})
