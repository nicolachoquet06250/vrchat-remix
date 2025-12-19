import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import * as schema from './schema'

let cached: {
  pool: mysql.Pool | null
  db: ReturnType<typeof drizzle<typeof schema>> | null
} = (globalThis as any).__drizzleCache || { pool: null, db: null }

export function getDb() {
  if (cached.db && cached.pool) return cached.db

  const config = useRuntimeConfig()
  const databaseUrl = config.databaseUrl
  if (!databaseUrl) {
    throw new Error('Missing runtimeConfig.databaseUrl')
  }

  const pool = mysql.createPool(databaseUrl)
  // @ts-ignore
  const db = drizzle(pool, {
    schema,
    mode: process.env.DB_ENGINE === 'mariadb' ? 'planetscale' : 'default'
  })

  // @ts-ignore
  cached = { pool, db }
  ;(globalThis as any).__drizzleCache = cached
  return db
}

export type DB = ReturnType<typeof getDb>
