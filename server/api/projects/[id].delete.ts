import {z} from 'zod';
import {getDb} from "~~/server/db/client";
import {projects, users} from '~~/server/db/schema'
import {eq} from "drizzle-orm";
import { requireAuth } from '~~/server/utils/auth'

const ParamsSchema = z.object({ id: z.coerce.number().int().min(1) })

export default defineEventHandler(async (event) => {
    const session = await requireAuth(event)
    const params = getRouterParams(event)
    const parsed = ParamsSchema.safeParse(params)
    if (!parsed.success) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid id', data: parsed.error.flatten() })
    }
    const id = parsed.data.id;

    const db = getDb()
    const proj = await db.query.projects.findFirst({ where: eq(projects.id, id) })
    if (!proj) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
    const me = await db.query.users.findFirst({ where: eq(users.id, Number(session.sub)) })
    const canDelete = me && ((me as any).role === 'creator' || Number((proj as any).userId) === Number(session.sub))
    if (!canDelete) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    try {
        await db.delete(projects).where(eq(projects.id, id))
        return true;
    } catch (err: any) {
        throw createError({ statusCode: 400, statusMessage: err.message, data: err.stack })
    }
})