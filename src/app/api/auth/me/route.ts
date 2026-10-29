import { NextResponse } from 'next/server'
import { getCurrentUser, createSession } from '@/lib/auth'
import { ensureDemoAccount } from '@/lib/seed'

export async function GET() {
  try {
    let user = await getCurrentUser()

    // No valid session → transparently start a demo session so visitors
    // land straight on the dashboard (auth page removed).
    if (!user) {
      const demo = await ensureDemoAccount()
      await createSession(demo.id)
      user = demo
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, baseCurrency: user.baseCurrency, rates: user.rates },
    })
  } catch (err) {
    console.error('[me]', err)
    return NextResponse.json({ user: null }, { status: 200 })
  }
}
