import { cookies, headers } from 'next/headers'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'

const SESSION_COOKIE = 'fintrack_session'
const SESSION_DAYS = 30

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false
    const candidate = scryptSync(password, salt, 64)
    const expected = Buffer.from(hash, 'hex')
    return candidate.length === expected.length && timingSafeEqual(candidate, expected)
  } catch {
    return false
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({ data: { token, userId, expiresAt } })
  const jar = await cookies()
  // Behind HTTPS (preview gateway), mark the cookie SameSite=None + Partitioned so it
  // also works inside cross-site preview iframes. Plain http (localhost) keeps Lax.
  const proto = ((await headers()).get('x-forwarded-proto') ?? '').split(',')[0].trim()
  const base = { httpOnly: true as const, path: '/', expires: expiresAt }
  try {
    if (proto === 'https') {
      jar.set(SESSION_COOKIE, token, { ...base, sameSite: 'none', secure: true, partitioned: true })
    } else {
      jar.set(SESSION_COOKIE, token, { ...base, sameSite: 'lax', secure: false })
    }
  } catch {
    jar.set(SESSION_COOKIE, token, { ...base, sameSite: 'lax', secure: false })
  }
  return token
}

/** Session token from the x-session-token header (iframe-safe) or the cookie (same-site) */
export async function getSessionToken(): Promise<string | null> {
  const h = await headers()
  const fromHeader = h.get('x-session-token')
  if (fromHeader) return fromHeader
  const jar = await cookies()
  return jar.get(SESSION_COOKIE)?.value ?? null
}

export async function destroySession(): Promise<void> {
  const token = await getSessionToken()
  if (token) {
    await db.session.deleteMany({ where: { token } })
  }
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export async function getCurrentUser() {
  const token = await getSessionToken()
  if (!token) return null
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  return session.user
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new AuthError()
  return user
}

export class AuthError extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'AuthError'
  }
}
