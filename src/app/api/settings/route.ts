import { NextRequest } from 'next/server'
import { withUser, db } from '@/lib/api-helpers'

/** PUT { name?, baseCurrency?, rates? } — profile + currency settings. */
export async function PUT(req: NextRequest) {
  return withUser(async (user) => {
    const body = await req.json()
    const data: Record<string, unknown> = {}
    if (body.name !== undefined) {
      const name = String(body.name).trim()
      if (!name) throw new Error('Name cannot be empty.')
      data.name = name
    }
    if (body.baseCurrency !== undefined) {
      const code = String(body.baseCurrency).toUpperCase()
      if (!/^[A-Z]{3}$/.test(code)) throw new Error('Invalid currency code.')
      data.baseCurrency = code
    }
    if (body.rates !== undefined) {
      data.rates = body.rates && typeof body.rates === 'object' ? JSON.stringify(body.rates) : null
    }
    const updated = await db.user.update({ where: { id: user.id }, data })
    return {
      user: { id: updated.id, email: updated.email, name: updated.name, baseCurrency: updated.baseCurrency, rates: updated.rates },
    }
  })
}

/** DELETE { action: 'clearTransactions' | 'clearBudgets' | 'clearAll' } */
export async function DELETE(req: NextRequest) {
  return withUser(async (user) => {
    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? '')
    if (action === 'clearTransactions') {
      await db.transaction.deleteMany({ where: { userId: user.id } })
    } else if (action === 'clearBudgets') {
      await db.budget.deleteMany({ where: { userId: user.id } })
    } else if (action === 'clearAll') {
      await db.transaction.deleteMany({ where: { userId: user.id } })
      await db.budget.deleteMany({ where: { userId: user.id } })
      await db.goal.deleteMany({ where: { userId: user.id } })
      await db.insight.deleteMany({ where: { userId: user.id } })
    } else {
      throw new Error('Unknown action.')
    }
    return { ok: true }
  })
}
