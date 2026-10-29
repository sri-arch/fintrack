import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    const user = await db.user.findUnique({ where: { email } })
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Incorrect email or password. Please try again.' }, { status: 401 })
    }

    await createSession(user.id)
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, baseCurrency: user.baseCurrency } })
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ error: 'Could not sign you in. Please try again.' }, { status: 500 })
  }
}
