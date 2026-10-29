import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession, verifyPassword } from '@/lib/auth'
import { seedUserData, ensureDemoAccount } from '@/lib/seed'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const name = String(body.name ?? '').trim()
    const baseCurrency = String(body.baseCurrency ?? 'USD')
    const seedSample = body.seedSample !== false

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ error: 'Please tell us your name.' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      // If it is the shared demo account, allow signing in with its known password
      if (email === 'demo@fintrack.app' && verifyPassword(password, existing.passwordHash)) {
        await createSession(existing.id)
        return NextResponse.json({ user: publicUser(existing) })
      }
      return NextResponse.json({ error: 'An account with this email already exists. Try signing in.' }, { status: 409 })
    }

    const user = await db.user.create({
      data: { email, passwordHash: hashPassword(password), name, baseCurrency },
    })

    if (seedSample) {
      await seedUserData(user.id, baseCurrency)
    }

    await createSession(user.id)
    return NextResponse.json({ user: publicUser(user) })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 500 })
  }
}

/** GET /api/auth/register → instant demo login (creates/refreshes the demo account) */
export async function GET() {
  try {
    const demo = await ensureDemoAccount()
    await createSession(demo.id)
    return NextResponse.json({ user: { id: demo.id, email: demo.email, name: demo.name, baseCurrency: demo.baseCurrency } })
  } catch (err) {
    console.error('[demo-login]', err)
    return NextResponse.json({ error: 'Could not start the demo. Please try again.' }, { status: 500 })
  }
}

function publicUser(u: { id: string; email: string; name: string; baseCurrency: string }) {
  return { id: u.id, email: u.email, name: u.name, baseCurrency: u.baseCurrency }
}
