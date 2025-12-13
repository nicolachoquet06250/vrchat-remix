import { getDb } from '~~/server/db/client'
import { sendVerifiedConfirmation } from '~~/server/utils/mail'
import { users } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const token = getQuery(event).token as string | undefined
  if (!token) {
    // Missing token -> redirect to invalid page
    return sendRedirect(event, '/verify/invalid', 302)
  }

  const db = getDb()
  const query = db.query
  if (!('users' in query)) return query

  const user = await query.users.findFirst({
    where: (u, { eq: _eq }) => _eq(u.verificationToken, token),
  })

  if (!user) {
    return sendRedirect(event, '/verify/invalid', 302)
  }

  // Check expiry and already verified
  const now = new Date()
  if (user.emailVerifiedAt) {
    return sendRedirect(event, '/verify/success', 302)
  }
  if (!user.verificationExpiresAt || user.verificationExpiresAt < now) {
    return sendRedirect(event, '/verify/invalid', 302)
  }

  // Mark verified and clear token fields
  await db.update(users)
    .set({ emailVerifiedAt: now as any, verificationToken: null as any, verificationExpiresAt: null as any })
    .where(eq(users.id, user.id))

  // Fire-and-forget confirmation email
  sendVerifiedConfirmation(user.email, user.username).catch(() => {})

  return sendRedirect(event, '/verify/success', 302)
})
