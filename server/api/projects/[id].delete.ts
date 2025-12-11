import {z} from 'zod';
import {getDb} from "~~/server/db/client";
import {projects} from '~~/server/db/schema'
import {eq} from "drizzle-orm";

const ParamsSchema = z.object({ id: z.coerce.number().int().min(1) })

export default defineEventHandler(async (event) => {
    const params = getRouterParams(event)
    const parsed = ParamsSchema.safeParse(params)
    if (!parsed.success) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid id', data: parsed.error.flatten() })
    }
    const id = parsed.data.id
    try {
        await getDb().delete(projects).where(eq(projects.id, id))
        return true;
    } catch (err: any) {
        throw createError({ statusCode: 400, statusMessage: err.message, data: err.stack })
    }
})