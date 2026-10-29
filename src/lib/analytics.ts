// Server-side analytics: month aggregations, safe-to-spend, budget status, rule-based insights
import { db } from '@/lib/db'
import { buildRates, convert, getCurrency, type RateMap } from '@/lib/currency'

export interface UserRates {
  baseCurrency: string
  rates: RateMap
}

export async function getUserRates(user: { baseCurrency: string; rates: string | null }): Promise<UserRates> {
  let custom = null
  if (user.rates) {
    try {
      custom = JSON.parse(user.rates)
    } catch {}
  }
  return { baseCurrency: user.baseCurrency, rates: buildRates(custom) }
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthBounds(key: string): { start: Date; end: Date } {
  const [y, m] = key.split('-').map(Number)
  return { start: new Date(y, m - 1, 1, 0, 0, 0, 0), end: new Date(y, m, 1, 0, 0, 0, 0) }
}

export interface AnalyticsPayload {
  month: string
  baseCurrency: string
  totals: { income: number; expense: number; net: number }
  prevTotals: { income: number; expense: number }
  byCategory: Array<{ categoryId: string | null; name: string; color: string; icon: string; amount: number; pct: number; count: number }>
  dailySeries: Array<{ day: string; expense: number; income: number }>
  cashflow90: Array<{ date: string; expense: number; income: number; net: number }>
  budgetStatus: Array<{ categoryId: string; name: string; color: string; icon: string; budgeted: number; spent: number; pct: number; status: 'ok' | 'warn' | 'over' }>
  budgetsTotal: number
  safeToSpend: { amount: number; perDayBase: number; daysLeft: number; daysInMonth: number } | null
  txCount: number
  topMerchant: { name: string; amount: number } | null
  streak: { activeDays: number; lastNoSpend: string | null }
}

export async function getAnalytics(userId: string, ur: UserRates, month?: string): Promise<AnalyticsPayload> {
  const now = new Date()
  const m = month ?? monthKey(now)
  const { start, end } = monthBounds(m)
  const prev = monthBounds(monthKey(new Date(start.getFullYear(), start.getMonth() - 1, 1)))
  const base = ur.baseCurrency

  const [txns, prevTxns, budgets, budgetsTotalAgg, last90] = await Promise.all([
    db.transaction.findMany({
      where: { userId, date: { gte: start, lt: end } },
      include: { category: true },
      orderBy: { date: 'desc' },
    }),
    db.transaction.findMany({
      where: { userId, date: { gte: prev.start, lt: prev.end } },
    }),
    db.budget.findMany({ where: { userId, month: m }, include: { category: true } }),
    db.budget.aggregate({ where: { userId, month: m }, _sum: { amount: true } }),
    db.transaction.findMany({
      where: { userId, date: { gte: new Date(now.getTime() - 90 * 86400e3) } },
      orderBy: { date: 'asc' },
    }),
  ])

  const toBase = (t: { amount: number; currency: string }) => convert(t.amount, t.currency, base, ur.rates)

  let income = 0
  let expense = 0
  for (const t of txns) {
    const v = toBase(t)
    if (t.type === 'INCOME') income += v
    else expense += v
  }
  let pIncome = 0
  let pExpense = 0
  for (const t of prevTxns) {
    const v = toBase(t)
    if (t.type === 'INCOME') pIncome += v
    else pExpense += v
  }

  // Category breakdown
  const catAgg = new Map<string, { amount: number; count: number; name: string; color: string; icon: string; id: string | null }>()
  for (const t of txns) {
    if (t.type !== 'EXPENSE') continue
    const key = t.categoryId ?? 'uncat'
    const entry = catAgg.get(key) ?? {
      amount: 0,
      count: 0,
      name: t.category?.name ?? 'Uncategorized',
      color: t.category?.color ?? '#94a3b8',
      icon: t.category?.icon ?? 'CircleEllipsis',
      id: t.categoryId,
    }
    entry.amount += toBase(t)
    entry.count += 1
    catAgg.set(key, entry)
  }
  const byCategory = [...catAgg.values()]
    .sort((a, b) => b.amount - a.amount)
    .map((c) => ({ categoryId: c.id, name: c.name, color: c.color, icon: c.icon, amount: c.amount, pct: expense > 0 ? (c.amount / expense) * 100 : 0, count: c.count }))

  // Daily series for the month
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  const dailyMap = new Map<string, { expense: number; income: number }>()
  for (let d = 1; d <= daysInMonth; d++) {
    dailyMap.set(`${m}-${String(d).padStart(2, '0')}`, { expense: 0, income: 0 })
  }
  for (const t of txns) {
    const key = `${monthKey(t.date)}-${String(t.date.getDate()).padStart(2, '0')}`
    const entry = dailyMap.get(key)
    if (!entry) continue
    if (t.type === 'INCOME') entry.income += toBase(t)
    else entry.expense += toBase(t)
  }
  const dailySeries = [...dailyMap.entries()].map(([day, v]) => ({ day, ...v }))

  // 90-day cashflow, weekly buckets
  const weeklyMap = new Map<string, { expense: number; income: number }>()
  for (const t of last90) {
    const d = t.date
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday
    const key = weekStart.toISOString().slice(0, 10)
    const entry = weeklyMap.get(key) ?? { expense: 0, income: 0 }
    if (t.type === 'INCOME') entry.income += toBase(t)
    else entry.expense += toBase(t)
    weeklyMap.set(key, entry)
  }
  const cashflow90 = [...weeklyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, ...v, net: v.income - v.expense }))

  // Budget status
  const spentByCat = new Map<string, number>()
  for (const t of txns) {
    if (t.type !== 'EXPENSE' || !t.categoryId) continue
    spentByCat.set(t.categoryId, (spentByCat.get(t.categoryId) ?? 0) + toBase(t))
  }
  const budgetStatus = budgets
    .map((b) => {
      const spent = spentByCat.get(b.categoryId) ?? 0
      const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0
      return {
        categoryId: b.categoryId,
        name: b.category.name,
        color: b.category.color,
        icon: b.category.icon,
        budgeted: b.amount,
        spent,
        pct,
        status: pct >= 100 ? ('over' as const) : pct >= 80 ? ('warn' as const) : ('ok' as const),
      }
    })
    .sort((a, b) => b.pct - a.pct)

  // Safe to spend: (total budgets − spent on budgeted cats) / days left in month
  const budgetsTotal = budgetsTotalAgg._sum.amount ?? 0
  const daysInMonthTotal = daysInMonth
  const isCurrentMonth = m === monthKey(now)
  const dayOfMonth = now.getDate()
  const daysLeft = isCurrentMonth ? Math.max(daysInMonthTotal - dayOfMonth + 1, 0) : 0
  const budgetedSpent = budgetStatus.reduce((s, b) => s + b.spent, 0)
  const safeToSpend = isCurrentMonth
    ? {
        amount: Math.max(budgetsTotal - budgetedSpent, 0),
        perDayBase: daysLeft > 0 ? Math.max((budgetsTotal - budgetedSpent) / daysLeft, 0) : 0,
        daysLeft,
        daysInMonth: daysInMonthTotal,
      }
    : null

  // Top merchant
  const merchAgg = new Map<string, number>()
  for (const t of txns) {
    if (t.type !== 'EXPENSE' || !t.merchant) continue
    merchAgg.set(t.merchant, (merchAgg.get(t.merchant) ?? 0) + toBase(t))
  }
  let topMerchant: AnalyticsPayload['topMerchant'] = null
  for (const [name, amount] of [...merchAgg.entries()].sort((a, b) => b[1] - a[1])) {
    topMerchant = { name, amount }
    break
  }

  // No-spend streak (walking backward from today)
  const spendDays = new Set(last90.filter((t) => t.type === 'EXPENSE').map((t) => t.date.toDateString()))
  let streakDays = 0
  let lastNoSpend: string | null = null
  const cursor = new Date(now)
  for (let i = 0; i < 90; i++) {
    if (spendDays.has(cursor.toDateString())) break
    streakDays++
    lastNoSpend = cursor.toISOString().slice(0, 10)
    cursor.setDate(cursor.getDate() - 1)
  }

  return {
    month: m,
    baseCurrency: base,
    totals: { income, expense, net: income - expense },
    prevTotals: { income: pIncome, expense: pExpense },
    byCategory,
    dailySeries,
    cashflow90,
    budgetStatus,
    budgetsTotal,
    safeToSpend,
    txCount: txns.length,
    topMerchant,
    streak: { activeDays: streakDays, lastNoSpend },
  }
}

// ---------- Rule-based insights ----------

export interface RuleInsight {
  type: 'ANOMALY' | 'BUDGET' | 'TREND' | 'TIP' | 'MILESTONE'
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL'
  title: string
  message: string
}

export function computeRuleInsights(a: AnalyticsPayload): RuleInsight[] {
  const out: RuleInsight[] = []
  const fmt = (n: number) => {
    try {
      return new Intl.NumberFormat(getCurrency(a.baseCurrency).locale, { style: 'currency', currency: a.baseCurrency, maximumFractionDigits: 0 }).format(n)
    } catch {
      return `${a.baseCurrency} ${n.toFixed(0)}`
    }
  }

  // Budget breaches & warnings
  for (const b of a.budgetStatus) {
    if (b.status === 'over') {
      out.push({
        type: 'BUDGET',
        severity: 'CRITICAL',
        title: `${b.name} budget exceeded`,
        message: `You've spent ${fmt(b.spent)} of your ${fmt(b.budgeted)} ${b.name} budget (${Math.round(b.pct)}%). Consider pausing spending here for the rest of the month.`,
      })
    } else if (b.status === 'warn') {
      out.push({
        type: 'BUDGET',
        severity: 'WARNING',
        title: `${b.name} is close to its limit`,
        message: `${Math.round(b.pct)}% of your ${b.name} budget is used (${fmt(b.spent)} of ${fmt(b.budgeted)}). A little caution keeps this green.`,
      })
    }
  }

  // Category anomalies: this month vs average of daily rate — simple spike check vs previous month
  // Use prevTotals for overall trend
  if (a.prevTotals.expense > 0) {
    const diff = ((a.totals.expense - a.prevTotals.expense) / a.prevTotals.expense) * 100
    if (diff >= 20) {
      out.push({
        type: 'TREND',
        severity: 'WARNING',
        title: 'Spending is up vs last month',
        message: `Your expenses are ${Math.round(diff)}% higher than the same period last month (${fmt(a.totals.expense)} vs ${fmt(a.prevTotals.expense)}). Check the categories that grew the most.`,
      })
    } else if (diff <= -10) {
      out.push({
        type: 'TREND',
        severity: 'SUCCESS',
        title: 'You are spending less this month',
        message: `Expenses are down ${Math.abs(Math.round(diff))}% vs last month. Bank the difference into a goal while the momentum is there.`,
      })
    }
  }

  // Category spikes: compare top category share vs its count
  const top = a.byCategory[0]
  if (top && top.pct > 35 && a.totals.expense > 0) {
    out.push({
      type: 'ANOMALY',
      severity: 'INFO',
      title: `${top.name} dominates this month`,
      message: `${top.name} is ${Math.round(top.pct)}% of all spending (${fmt(top.amount)} across ${top.count} entries). If that wasn't planned, it's worth a look.`,
    })
  }

  // Single large transaction anomaly (>3x median-ish: use >25% of total as proxy for big-ticket)
  const big = a.byCategory.find((c) => c.amount > a.totals.expense * 0.3 && c.count <= 3)
  if (big) {
    out.push({
      type: 'ANOMALY',
      severity: 'WARNING',
      title: `Large ${big.name} charge detected`,
      message: `${fmt(big.amount)} in just ${big.count} transaction${big.count > 1 ? 's' : ''} — that's ${Math.round((big.amount / a.totals.expense) * 100)}% of the month. One-off or a pattern to watch?`,
    })
  }

  // Savings rate
  if (a.totals.income > 0) {
    const rate = ((a.totals.income - a.totals.expense) / a.totals.income) * 100
    if (rate >= 20) {
      out.push({ type: 'MILESTONE', severity: 'SUCCESS', title: `Strong savings rate: ${Math.round(rate)}%`, message: `You kept ${fmt(a.totals.income - a.totals.expense)} of what you earned this month. Above 20% is excellent.` })
    } else if (rate < 0) {
      out.push({ type: 'TREND', severity: 'CRITICAL', title: 'Spending exceeded income', message: `You spent ${fmt(a.totals.expense - a.totals.income)} more than you earned this month. Review the largest categories first — small trims add up fast.` })
    }
  }

  // No-spend streak
  if (a.streak.activeDays >= 2) {
    out.push({ type: 'MILESTONE', severity: 'SUCCESS', title: `${a.streak.activeDays}-day no-spend streak`, message: `You haven't logged any spending for ${a.streak.activeDays} days. Momentum like this is how goals get funded early.` })
  }

  return out
}
