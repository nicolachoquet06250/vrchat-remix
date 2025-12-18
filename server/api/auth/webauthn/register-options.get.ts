import {generateRegistrationOptions} from '@simplewebauthn/server'
import {requireAuth} from '~~/server/utils/auth'
import {getDb} from '~~/server/db/client'
import {authenticators, users} from '~~/server/db/schema'
import {eq, sql} from 'drizzle-orm'
import {getWebAuthnConfig} from '~~/server/utils/webauthn'

async function getUser(session: any) {
  const userId = Number(session.sub);
  const db = getDb();

  const rows = await db
      .select({
        user: users,
        authenticator: sql`CONVERT(
          COALESCE(
            (SELECT JSON_ARRAYAGG(
                JSON_ARRAY(
                  ${authenticators.id},
                  ${authenticators.userId},
                  ${authenticators.publicKey},
                  ${authenticators.counter},
                  ${authenticators.deviceType},
                  ${authenticators.backedUp},
                  ${authenticators.transports},
                  ${authenticators.createdAt}
                )
              )
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

  return rows[0].user;
}

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const { rpID, rpName } = getWebAuthnConfig(event)
  const db = getDb()

  const user = process.env.DB_ENGINE === 'mariadb'
      ? await getUser(session)
      : await db.query.users.findFirst({
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
