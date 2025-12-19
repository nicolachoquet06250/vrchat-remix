import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { getDb } from '~~/server/db/client'
import {users, authenticators, type Authenticator} from '~~/server/db/schema'
import {eq, sql} from 'drizzle-orm'
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

  const rows = await db
      .select({
        user: users,
        authenticator: sql`CONVERT(
          COALESCE(
            (SELECT CAST(JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', ${authenticators.id},
                  'userId', ${authenticators.userId},
                  'publicKey', ${authenticators.publicKey},
                  'counter', ${authenticators.counter},
                  'deviceType', ${authenticators.deviceType},
                  'backedUp', ${authenticators.backedUp},
                  'transports', ${authenticators.transports},
                  'createdAt', ${authenticators.createdAt}
                )
              ) AS CHAR)
              FROM ${authenticators}
              WHERE ${authenticators.userId} = ${users.id}),
            JSON_ARRAY()
          )
          USING utf8mb4
        )`.as('authenticators'),
      })
      .from(users)
      .leftJoin(authenticators, eq(authenticators.userId, users.id))
      .where(eq(users.id, userId));

  if (rows.length === 0) return null;

  return {
      ...rows[0].user,
      authenticators: rows.map(r => r.authenticator)
          .filter(a => a !== null) as Authenticator[],
  };
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
  user!.authenticators = JSON.parse(user?.authenticators as unknown as string);

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
