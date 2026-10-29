import { NextRequest } from 'next/server'
import { withUser, db } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  return withUser(async (user) => {
    const sp = req.nextUrl.searchParams
    const type = sp.get('type')
    const categoryId = sp.get('categoryId')
    const search = sp.get('q')
    const from = sp.get('from')
    const to = sp.get('to')
    const limit = Math.min(Number(sp.get('limit') ?? 200), 500)

    const where: Record<string, unknown> = { userId: user.id }
    if (type === 'EXPENSE' || type === 'INCOME') where.type = type
    if (categoryId) where.categoryId = categoryId
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { merchant: { contains: search } },
        { notes: { contains: search } },
      ]
    }
    if (from || to) {
      where.date = {}
      if (from) (where.date as Record<string, unknown>).gte = new Date(from)
      if (to) (where.date as Record<string, unknown>).lte = new Date(`${to}T23:59:59.999Z`)
    }

    const transactions = await db.transaction.findMany({
      where,
      include: { category: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    })
    return { transactions }
  })
}

export async function POST(req: NextRequest) {
  return withUser(async (user) => {
    const body = await req.json()
    const type = body.type === 'INCOME' ? 'INCOME' : 'EXPENSE'
    const amount = Number(body.amount)
    if (!isFinite(amount) || amount <= 0) throw new Error('Please enter an amount greater than zero.')
    const description = String(body.description ?? '').trim()
    if (!description) throw new Error('A short description helps you remember this entry later.')
    const date = body.date ? new Date(body.date) : new Date()
    if (isNaN(date.getTime())) throw new Error('Invalid date.')

    const txn = await db.transaction.create({
      data: {
        userId: user.id,
        type,
        amount,
        currency: String(body.currency ?? user.baseCurrency),
        description,
        merchant: body.merchant ? String(body.merchant).trim() : null,
        notes: body.notes ? String(body.notes).trim() : null,
        categoryId: body.categoryId || null,
        date,
        aiCategorized: Boolean(body.aiCategorized),
      },
      include: { category: true },
    })
    return { transaction: txn }
  })
}
