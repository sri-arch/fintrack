import { NextResponse } from 'next/server'
import { AuthError, requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import type { User } from '@prisma/client'

export async function withUser<T>(handler: (user: User) => Promise<T>): Promise<NextResponse> {
  try {
    const user = await requireUser()
    const data = await handler(user)
    return NextResponse.json(data ?? { ok: true })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 })
    }
    console.error('[api]', err)
    const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback
  return raw as T
}

export { db }
