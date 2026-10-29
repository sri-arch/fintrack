'use client'
// Dashboard: safe-to-spend hero, month summary, savings rate, pace projection, cash flow trend,
// goal snapshot, budget snapshot, recent activity, quick insights

import { useMemo } from 'react'
import {
  ArrowDownRight, ArrowUpRight, Flame, Info, Sparkles, Wallet, Plus, Target,
  TriangleAlert, TrendingDown, TrendingUp, CalendarDays,
} from 'lucide-react'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AppIcon } from './app-icon'
import { DonutChart, DailyBarsChart, CashflowChart, GoalRing } from './charts'
import { money, fmtDate, monthLabel, type Analytics, type Category, type Goal, type RuleInsight, type Transaction, type User } from '@/lib/client'

interface Props {
  user: User
  analytics: Analytics | undefined
  insights: RuleInsight[]
  recent: Transaction[] | undefined
  categories: Category[]
  goals: Goal[] | undefined
  loading: boolean
  onAdd: () => void
  onGo: (tab: 'transactions' | 'budgets' | 'insights' | 'goals') => void
}

export function DashboardView({ user, analytics, insights, recent, goals, loading, onAdd, onGo }: Props) {
  const base = user.baseCurrency
  const a = analytics

  const donutData = useMemo(
    () => (a ? a.byCategory.slice(0, 8).map((c) => ({ name: c.name, value: c.amount, color: c.color })) : []),
    [a]
  )

  const expenseDelta = a && a.prevTotals.expense > 0 ? ((a.totals.expense - a.prevTotals.expense) / a.prevTotals.expense) * 100 : null

  // Savings rate: share of income kept this month (20% is the healthy benchmark)
  const savingsRate = a && a.totals.income > 0 ? (a.totals.net / a.totals.income) * 100 : null

  // Month-end pace projection: average daily spend × days in month (current month only)
  const isCurrentMonth = Boolean(a?.safeToSpend)
  const dayOfMonth = new Date().getDate()
  const daysInMonth = a?.safeToSpend?.daysInMonth ?? 0
  const projected = a && isCurrentMonth && dayOfMonth > 0 && a.totals.expense > 0
    ? (a.totals.expense / dayOfMonth) * daysInMonth
    : null

  // Goals snapshot: most-progressed active goals first
  const allGoals = goals ?? []
  const goalPct = (g: Goal) => (g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0)
  const goalList = allGoals
    .filter((g) => g.status === 'ACTIVE')
    .sort((x, y) => goalPct(y) - goalPct(x))
    .slice(0, 3)
  const completedGoals = allGoals.filter((g) => g.status === 'COMPLETED').length

  const severityStyle: Record<string, string> = {
    CRITICAL: 'border-rose-200 bg-rose-50 text-rose-900',
    WARNING: 'border-amber-200 bg-amber-50 text-amber-900',
    SUCCESS: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    INFO: 'border-sky-200 bg-sky-50 text-sky-900',
  }
  const severityIcon: Record<string, typeof Info> = {
    CRITICAL: TriangleAlert,
    WARNING: TriangleAlert,
    SUCCESS: TrendingUp,
    INFO: Info,
  }

  if (loading || !a) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
        <Skeleton className="h-44 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    )
  }

  const todayKey = `${a.month}-${String(new Date().getDate()).padStart(2, '0')}`

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Safe-to-spend hero */}
      <section className="rounded-2xl bg-primary text-primary-foreground p-5 sm:p-7 relative overflow-hidden" aria-label="Safe to spend today">
        <div className="absolute -top-16 -right-10 size-56 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -bottom-20 right-24 size-40 rounded-full bg-white/5" aria-hidden="true" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <p className="text-sm text-white/80 flex items-center gap-1.5 font-medium">
              <Wallet className="size-4" aria-hidden="true" /> Safe to spend today
            </p>
            <p className="mt-1.5 text-4xl sm:text-5xl font-bold tracking-tight tabular-nums" aria-label={`${money(a.safeToSpend?.perDayBase ?? 0, base)} per day`}>
              {money(a.safeToSpend?.perDayBase ?? 0, base)}
            </p>
            <p className="mt-2 text-sm text-white/80 max-w-md">
              {a.safeToSpend && a.safeToSpend.daysLeft > 0 ? (
                <>
                  {money(a.safeToSpend.amount, base)} left across {money(a.budgetsTotal, base, { compact: true, noDecimals: true })} of budgets · {a.safeToSpend.daysLeft} day{a.safeToSpend.daysLeft !== 1 ? 's' : ''} to go in {monthLabel(a.month).split(' ')[0]}
                </>
              ) : (
                <>Budgets cover {money(a.budgetsTotal, base)} this month.</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {a.streak.activeDays >= 2 && (
              <Badge className="bg-white/15 text-white border-0 hover:bg-white/15 gap-1 px-3 py-1.5 rounded-xl">
                <Flame className="size-3.5" aria-hidden="true" /> {a.streak.activeDays}-day no-spend streak
              </Badge>
            )}
            <Button onClick={onAdd} className="bg-white text-primary hover:bg-white/90 rounded-xl min-h-11 px-5 font-semibold shadow-sm">
              <Plus className="size-4" aria-hidden="true" /> Add entry
            </Button>
          </div>
        </div>
      </section>

      {/* Month summary */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="This month's summary">
        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground font-medium">Money in</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">{money(a.totals.income, base)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{monthLabel(a.month)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground font-medium">Money out</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-rose-600">{money(a.totals.expense, base)}</p>
            {expenseDelta !== null && (
              <p className={`mt-1 text-xs flex items-center gap-1 font-medium ${expenseDelta > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                {expenseDelta > 0 ? <ArrowUpRight className="size-3" aria-hidden="true" /> : <ArrowDownRight className="size-3" aria-hidden="true" />}
                {Math.abs(Math.round(expenseDelta))}% vs last month
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground font-medium">Kept (net)</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${a.totals.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{money(a.totals.net, base)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{a.txCount} entries this month</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground font-medium">Savings rate</p>
            {savingsRate === null ? (
              <>
                <p className="mt-1 text-2xl font-bold tabular-nums text-muted-foreground">—</p>
                <p className="mt-1 text-xs text-muted-foreground">Add income to see this</p>
              </>
            ) : (
              <>
                <p className={`mt-1 text-2xl font-bold tabular-nums ${savingsRate >= 20 ? 'text-emerald-600' : savingsRate >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {Math.round(savingsRate)}%
                </p>
                <div className="mt-2">
                  <Progress value={Math.min(Math.max(savingsRate, 0), 100)} className="h-1.5" aria-label={`Savings rate ${Math.round(savingsRate)}%, benchmark 20%`} />
                  <p className={`mt-1.5 text-xs font-medium ${savingsRate >= 20 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {savingsRate >= 20 ? 'Above the 20% benchmark' : '20%+ is the healthy zone'}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Charts row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl shadow-sm border">
          <CardHeader className="pb-1">
            <CardTitle className="text-base font-semibold">Where it went</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="relative">
              <DonutChart data={donutData} currency={base} />
              <div className="absolute inset-0 grid place-items-center pointer-events-none" aria-hidden="true">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground font-medium">Total out</p>
                  <p className="text-xl font-bold tabular-nums">{money(a.totals.expense, base, { compact: true })}</p>
                </div>
              </div>
            </div>
            <div className="mt-2 space-y-1.5">
              {a.byCategory.slice(0, 4).map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} aria-hidden="true" />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="text-muted-foreground tabular-nums shrink-0">{Math.round(c.pct)}% · {money(c.amount, base, { compact: true })}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border">
          <CardHeader className="pb-1">
            <CardTitle className="text-base font-semibold">Daily spending</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => onGo('insights')} className="text-primary rounded-lg gap-1">
                <Sparkles className="size-3.5" aria-hidden="true" /> Insights
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-2">
            <DailyBarsChart data={a.dailySeries.map((d) => ({ day: d.day, expense: d.expense }))} currency={base} today={todayKey} />
            {projected !== null && (
              <p className="mt-3 text-xs text-muted-foreground px-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <TrendingUp className="size-3.5 shrink-0" aria-hidden="true" />
                <span>At this pace you&apos;ll spend about</span>
                <span className="font-semibold text-foreground tabular-nums">{money(projected, base)}</span>
                <span>by month end</span>
                {a.prevTotals.expense > 0 && (
                  <span className={`font-medium tabular-nums ${projected > a.prevTotals.expense ? 'text-rose-500' : 'text-emerald-600'}`}>
                    ({projected > a.prevTotals.expense ? '+' : '−'}{Math.abs(Math.round(((projected - a.prevTotals.expense) / a.prevTotals.expense) * 100))}% vs last month)
                  </span>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Cash flow trend + goals snapshot */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl shadow-sm border lg:col-span-2">
          <CardHeader className="pb-1">
            <CardTitle className="text-base font-semibold">Cash flow — last 3 months</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => onGo('insights')} className="text-primary rounded-lg gap-1">
                <Sparkles className="size-3.5" aria-hidden="true" /> Details
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-2">
            {a.cashflow90.length === 0 ? (
              <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">
                No transactions in the last 90 days yet.
              </div>
            ) : (
              <CashflowChart data={a.cashflow90} currency={base} height={220} />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-1.5">
              <Target className="size-4 text-primary" aria-hidden="true" /> Goals
            </CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => onGo('goals')} className="text-primary rounded-lg">
                Manage
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {allGoals.length === 0 ? (
              <div className="py-5 text-center">
                <Target className="size-7 mx-auto text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold mt-2">No goals yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[220px] mx-auto">
                  Save for what matters — an emergency fund is a great start.
                </p>
                <Button variant="outline" size="sm" onClick={() => onGo('goals')} className="mt-3 rounded-xl">
                  Set a goal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {goalList.map((g) => {
                  const eta = g.targetDate ? Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / (30 * 86400e3)) : null
                  const monthlyNeeded = eta && eta > 0 ? Math.max(g.targetAmount - g.currentAmount, 0) / eta : null
                  return (
                    <div key={g.id} className="flex items-center gap-3">
                      <GoalRing pct={goalPct(g)} color={g.color} size={56} label={g.name} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                          <AppIcon name={g.icon} className="size-3.5 shrink-0" style={{ color: g.color }} />
                          <span className="truncate">{g.name}</span>
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                          {money(g.currentAmount, g.currency, { compact: true })} of {money(g.targetAmount, g.currency, { compact: true })}
                        </p>
                        <p className="text-xs font-medium mt-0.5 text-primary">
                          {g.status === 'COMPLETED'
                            ? 'Goal reached'
                            : monthlyNeeded
                              ? `~${money(monthlyNeeded, g.currency, { noDecimals: true })}/mo needed`
                              : eta !== null && eta > 0
                                ? `${eta} month${eta !== 1 ? 's' : ''} left`
                                : 'No deadline'}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {completedGoals > 0 && (
                  <p className="text-xs text-muted-foreground pt-1 border-t">
                    {completedGoals} completed goal{completedGoals !== 1 ? 's' : ''} — view them in Goals.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Insights + budgets + recent */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl shadow-sm border lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-1.5">
              <Sparkles className="size-4 text-primary" aria-hidden="true" /> Smart alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">All clear — nothing unusual in your spending this month.</p>
            ) : (
              insights.slice(0, 4).map((ins, i) => {
                const Icon = severityIcon[ins.severity] ?? Info
                return (
                  <div key={i} className={`rounded-xl border p-3 text-[13px] leading-relaxed ${severityStyle[ins.severity] ?? severityStyle.INFO}`}>
                    <p className="font-semibold flex items-center gap-1.5">
                      <Icon className="size-3.5 shrink-0" aria-hidden="true" /> {ins.title}
                    </p>
                    <p className="mt-0.5 opacity-90">{ins.message}</p>
                  </div>
                )
              })
            )}
            <Button variant="ghost" size="sm" onClick={() => onGo('insights')} className="w-full text-primary rounded-xl">
              See all insights
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Budgets</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => onGo('budgets')} className="text-primary rounded-lg">
                Manage
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {a.budgetStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No budgets yet. Set one per category and FinTrack will warn you before you overspend.
              </p>
            ) : (
              a.budgetStatus.slice(0, 5).map((b) => (
                <div key={b.categoryId}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="size-6 rounded-lg grid place-items-center shrink-0" style={{ backgroundColor: `${b.color}1a` }}>
                        <AppIcon name={b.icon} className="size-3.5" style={{ color: b.color }} />
                      </span>
                      <span className="truncate font-medium">{b.name}</span>
                    </span>
                    <span className={`text-xs tabular-nums shrink-0 font-medium ${b.status === 'over' ? 'text-rose-600' : b.status === 'warn' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {money(b.spent, base, { compact: true })} / {money(b.budgeted, base, { compact: true, noDecimals: true })}
                    </span>
                  </div>
                  <Progress value={Math.min(b.pct, 100)} className="h-2" aria-label={`${b.name}: ${Math.round(b.pct)}% of budget used`} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={() => onGo('transactions')} className="text-primary rounded-lg">
                View all
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-1">
            {(recent ?? []).slice(0, 6).map((t) => {
              const cat = t.category
              return (
                <div key={t.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <span className="size-9 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: `${cat?.color ?? '#94a3b8'}1a` }}>
                    <AppIcon name={cat?.icon ?? 'CircleEllipsis'} className="size-4" style={{ color: cat?.color ?? '#64748b' }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-xs text-muted-foreground truncate">{cat?.name ?? 'Uncategorized'} · {fmtDate(t.date)}</p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums shrink-0 ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-foreground'}`}>
                    {t.type === 'INCOME' ? '+' : '−'}
                    {money(t.amount, t.currency)}
                    {t.currency !== base && <span className="block text-[10px] text-muted-foreground text-right font-normal">{t.currency}</span>}
                  </span>
                </div>
              )
            })}
            {(recent ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Nothing yet — add your first entry.</p>
            )}
          </CardContent>
        </Card>
      </section>

      {a.topMerchant && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          Most spent at this month: <span className="font-medium text-foreground">{a.topMerchant.name}</span> ({money(a.topMerchant.amount, base)})
        </p>
      )}
    </div>
  )
}
