import argon2 from 'argon2'
import { SignJWT, jwtVerify } from 'jose'

const COOKIE_NAME = 'session'

export async function hashPassword(password: string) {
  // Argon2id with reasonable defaults; memoryCost/timeCost are tuned by lib
  return argon2.hash(password, { type: argon2.argon2id })
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password)
}

function getJwtSecretKey() {
  const secret = useRuntimeConfig().jwtSecret
  if (!secret) throw new Error('Missing runtimeConfig.jwtSecret')
  return new TextEncoder().encode(secret)
}

export async function createSessionJwt(payload: { sub: string; email: string; username: string }) {
  const key = getJwtSecretKey()
  return await new SignJWT(payload)
      .setProtectedHeader({alg: 'HS256'})
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(key)
}

export async function verifySessionJwt(token: string) {
  const key = getJwtSecretKey()
  const { payload } = await jwtVerify(token, key)
  return payload as { sub: string; email: string; username: string; iat: number; exp: number }
}

export function setSessionCookie(event: any, token: string) {
  const isProd = process.env.NODE_ENV === 'production'
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export function clearSessionCookie(event: any) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export async function getSession(event: any) {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null
  try {
    return await verifySessionJwt(token)
  } catch {
    return null
  }
}

export async function requireAuth(event: any) {
  const session = await getSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return session
}
