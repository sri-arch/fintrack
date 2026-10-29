'use client'
// Dashboard: safe-to-spend hero, month summary, budget snapshot, recent activity, quick insights

import { useMemo } from 'react'
import {
  ArrowDownRight, ArrowUpRight, Flame, Info, Sparkles, Wallet, Plus,
  TriangleAlert, TrendingDown, TrendingUp, CalendarDays,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AppIcon } from './app-icon'
import { DonutChart, DailyBarsChart } from './charts'
import { money, fmtDate, monthLabel, type Analytics, type Category, type RuleInsight, type Transaction, type User } from '@/lib/client'

interface Props {
  user: User
  analytics: Analytics | undefined
  insights: RuleInsight[]
  recent: Transaction[] | undefined
  categories: Category[]
  loading: boolean
  onAdd: () => void
  onGo: (tab: 'transactions' | 'budgets' | 'insights') => void
}

export function DashboardView({ user, analytics, insights, recent, loading, onAdd, onGo }: Props) {
  const base = user.baseCurrency
  const a = analytics

  const donutData = useMemo(
    () => (a ? a.byCategory.slice(0, 8).map((c) => ({ name: c.name, value: c.amount, color: c.color })) : []),
    [a]
  )

  const expenseDelta = a && a.prevTotals.expense > 0 ? ((a.totals.expense - a.prevTotals.expense) / a.prevTotals.expense) * 100 : null

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
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="This month's summary">
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
          <CardHeader className="pb-1 flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Daily spending</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onGo('insights')} className="text-primary rounded-lg gap-1">
              <Sparkles className="size-3.5" aria-hidden="true" /> Insights
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            <DailyBarsChart data={a.dailySeries.map((d) => ({ day: d.day, expense: d.expense }))} currency={base} today={todayKey} />
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
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Budgets</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onGo('budgets')} className="text-primary rounded-lg">
              Manage
            </Button>
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
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onGo('transactions')} className="text-primary rounded-lg">
              View all
            </Button>
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
