import {getDb} from '~~/server/db/client'
import {savedSearches} from '~~/server/db/schema'
import {requireAuth} from '~~/server/utils/auth'
import {eq} from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)
  const db = getDb()
  return await db.select().from(savedSearches).where(eq(savedSearches.userId, Number(session.sub)))
})
