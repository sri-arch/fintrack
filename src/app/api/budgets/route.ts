import { NextRequest } from 'next/server'
import { withUser, db } from '@/lib/api-helpers'
import { monthKey } from '@/lib/analytics'

export async function GET(req: NextRequest) {
  return withUser(async (user) => {
    const sp = req.nextUrl.searchParams
    const month = sp.get('month') ?? monthKey(new Date())
    const budgets = await db.budget.findMany({
      where: { userId: user.id, month },
      include: { category: true },
    })
    return { budgets, month }
  })
}

/** Upsert one budget { categoryId, amount, month } */
export async function PUT(req: NextRequest) {
  return withUser(async (user) => {
    const body = await req.json()
    const categoryId = String(body.categoryId ?? '')
    const month = String(body.month ?? monthKey(new Date()))
    const amount = Number(body.amount)
    if (!categoryId) throw new Error('Choose a category for this budget.')
    if (!isFinite(amount) || amount < 0) throw new Error('Budget amount must be zero or more.')
    const cat = await db.category.findFirst({ where: { id: categoryId, userId: user.id } })
    if (!cat) throw new Error('Category not found.')

    if (amount === 0) {
      await db.budget.deleteMany({ where: { userId: user.id, categoryId, month } })
      return { ok: true, removed: true }
    }
    const budget = await db.budget.upsert({
      where: { userId_categoryId_month: { userId: user.id, categoryId, month } },
      update: { amount },
      create: { userId: user.id, categoryId, amount, month },
      include: { category: true },
    })
    return { budget }
  })
}
