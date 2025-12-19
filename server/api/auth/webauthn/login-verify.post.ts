import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { getDb } from '~~/server/db/client'
import {users, authenticators, type Authenticator, type User} from '~~/server/db/schema'
import {eq} from 'drizzle-orm'
import { createSessionJwt, setSessionCookie } from '~~/server/utils/auth'
import { getWebAuthnConfig } from '~~/server/utils/webauthn'

function publicKeyFromDrizzleStringToUint8Array(s: string): Uint8Array {
  const b64 = s
      .trim()
      .replace(/^base64:type\d+:/, '') // enlève "base64:type252:"
      .replace(/\s+/g, '');           // enlève espaces / retours ligne

  const buf = Buffer.from(b64, 'base64');
  if (buf.length === 0) throw new Error('publicKey decoded empty');
  return new Uint8Array(buf);
}

async function getUser(userId: number) {
  const db = getDb();
  const u = await db
      .select()
      .from(users)
      .where(eq(users.id, userId)) as unknown as (User & { authenticators: Authenticator[] })[];
  if (u.length === 0) return null;
  for (const i in u) {
      u[i].authenticators = await db.select().from(authenticators).where(eq(authenticators.userId, u[i].id));
  }
  return u[0];
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const expectedChallenge = getCookie(event, 'webauthn_auth_challenge')
  const userId = getCookie(event, 'webauthn_auth_user_id')
  const { rpID, origin } = getWebAuthnConfig(event)

  if (!expectedChallenge || !userId) {
    throw createError({ statusCode: 400, statusMessage: 'Session expired or invalid' })
  }

  const db = getDb()
  const user = process.env.DB_ENGINE === 'mariadb'
      ? await getUser(Number(userId))
      : await db.query.users.findFirst({
        where: eq(users.id, Number(userId)),
        with: {
          authenticators: true
        }
      });

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const authenticator = user.authenticators.find((auth: any) => auth.id === body.id)

  if (!authenticator) {
    throw createError({ statusCode: 400, statusMessage: 'Authenticator not found' })
  }

  const publicKey = publicKeyFromDrizzleStringToUint8Array(
      String(authenticator.publicKey)
  );

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: authenticator.id,
      // @ts-ignore
      publicKey: publicKey,
      counter: authenticator.counter,
    }
  })

  if (verification.verified) {
    const { newCounter } = verification.authenticationInfo

    await db.update(authenticators)
      .set({ counter: newCounter })
      .where(eq(authenticators.id, authenticator.id))

    // Create session
    const jwt = await createSessionJwt({
      sub: String(user.id),
      email: user.email,
      username: user.username,
    })
    setSessionCookie(event, jwt)

    deleteCookie(event, 'webauthn_auth_challenge')
    deleteCookie(event, 'webauthn_auth_user_id')

    return { ok: true }
  }

  throw createError({ statusCode: 400, statusMessage: 'Verification failed' })
})
