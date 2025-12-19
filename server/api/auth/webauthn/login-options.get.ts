import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { getDb } from '~~/server/db/client'
import {authenticators, users} from '~~/server/db/schema'
import { eq, or, sql } from 'drizzle-orm'
import { getWebAuthnConfig } from '~~/server/utils/webauthn'

async function getUser(emailOrUsername: string) {
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
      .where(or(eq(users.email, emailOrUsername), eq(users.username, emailOrUsername)));

  if (rows.length === 0) return null;

  return rows[0].user;
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const emailOrUsername = query.username as string
  const { rpID } = getWebAuthnConfig(event)

  const db = getDb()
  const user = process.env.DB_ENGINE === 'mariadb'
      ? await getUser(emailOrUsername)
      : await db.query.users.findFirst({
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
