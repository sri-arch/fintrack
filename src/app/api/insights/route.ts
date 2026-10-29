import { NextRequest } from 'next/server'
import { withUser, db } from '@/lib/api-helpers'
import { getAnalytics, getUserRates, computeRuleInsights, monthKey, monthBounds } from '@/lib/analytics'
import { getCurrency } from '@/lib/currency'

/** GET: rule-based insights for the current month (computed fresh, instant). */
export async function GET(req: NextRequest) {
  return withUser(async (user) => {
    const month = req.nextUrl.searchParams.get('month') ?? monthKey(new Date())
    const ur = await getUserRates(user)
    const analytics = await getAnalytics(user.id, ur, month)
    const insights = computeRuleInsights(analytics)
    return { insights, month }
  })
}

/** POST: generate the AI monthly review and persist it. */
export async function POST(req: NextRequest) {
  return withUser(async (user) => {
    const body = await req.json().catch(() => ({}))
    const month = String(body.month ?? monthKey(new Date()))
    const ur = await getUserRates(user)
    const a = await getAnalytics(user.id, ur, month)

    const fmt = (n: number) =>
      new Intl.NumberFormat(getCurrency(a.baseCurrency).locale, { style: 'currency', currency: a.baseCurrency, maximumFractionDigits: 0 }).format(n)

    const { start } = monthBounds(month)
    const monthLabel = start.toLocaleString('en-US', { month: 'long', year: 'numeric' })

    const stats = {
      totalIncome: fmt(a.totals.income),
      totalExpense: fmt(a.totals.expense),
      net: fmt(a.totals.net),
      previousMonthExpense: fmt(a.prevTotals.expense),
      transactions: a.txCount,
      topMerchant: a.topMerchant ? `${a.topMerchant.name} (${fmt(a.topMerchant.amount)})` : 'none recorded',
      spendingByCategory: a.byCategory.map((c) => ({ category: c.name, amount: fmt(c.amount), share: `${Math.round(c.pct)}%`, entries: c.count })),
      budgetStatus: a.budgetStatus.map((b) => ({ category: b.name, budgeted: fmt(b.budgeted), spent: fmt(b.spent), state: b.status })),
      noSpendStreakDays: a.streak.activeDays,
    }

    const { aiMonthlyReview } = await import('@/lib/ai')
    let review: string
    try {
      review = await aiMonthlyReview({ userName: user.name, monthLabel, baseCurrency: a.baseCurrency, stats })
    } catch {
      throw new Error('The AI reviewer is busy right now. Please try again in a moment.')
    }

    // Keep only the latest AI review per month
    await db.insight.deleteMany({ where: { userId: user.id, kind: 'AI', type: 'REVIEW', data: { contains: month } } })
    const saved = await db.insight.create({
      data: {
        userId: user.id,
        kind: 'AI',
        type: 'REVIEW',
        severity: 'INFO',
        title: `AI review — ${monthLabel}`,
        message: review,
        data: JSON.stringify({ month, stats }),
      },
    })

    // Also persist rule-based insights snapshot for history
    return { review: saved }
  })
}

/** GET with ?review=month → latest saved AI review for that month. */
export async function PUT(req: NextRequest) {
  return withUser(async (user) => {
    const body = await req.json().catch(() => ({}))
    const month = String(body.month ?? monthKey(new Date()))
    const saved = await db.insight.findFirst({
      where: { userId: user.id, kind: 'AI', type: 'REVIEW', data: { contains: month } },
      orderBy: { createdAt: 'desc' },
    })
    return { review: saved ?? null }
  })
}
