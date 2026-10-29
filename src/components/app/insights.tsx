'use client'
// Insights: rule-based alerts, chart gallery, AI monthly review

import { useEffect, useState } from 'react'
import { Sparkles, Loader2, Info, TriangleAlert, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CashflowChart, DonutChart } from './charts'
import { api, money, monthLabel, type Analytics, type RuleInsight, type User } from '@/lib/client'

interface Props {
  user: User
  analytics: Analytics | undefined
  insights: RuleInsight[]
  loading: boolean
  month: string
  onMonthChange: (m: string) => void
  onChanged: () => void
}

interface AiReview {
  id: string
  title: string
  message: string
  createdAt: string
}

export function InsightsView({ user, analytics, insights, loading, month, onMonthChange, onChanged }: Props) {
  const [review, setReview] = useState<AiReview | null>(null)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const monthOptions = (() => {
    const out: string[] = []
    const d = new Date()
    for (let i = 0; i < 6; i++) {
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      d.setMonth(d.getMonth() - 1)
    }
    return out
  })()

  // Load any saved AI review for this month
  useEffect(() => {
    let cancelled = false
    api<{ review: AiReview | null }>('/api/insights', { method: 'PUT', body: JSON.stringify({ month }) })
      .then((res) => { if (!cancelled) setReview(res.review) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [month])

  async function generateReview() {
    setReviewBusy(true)
    setReviewError(null)
    try {
      const res = await api<{ review: AiReview }>('/api/insights', { method: 'POST', body: JSON.stringify({ month }) })
      setReview(res.review)
      onChanged()
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'The AI reviewer is unavailable right now.')
    } finally {
      setReviewBusy(false)
    }
  }

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

  if (loading || !analytics) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  const a = analytics
  const donutData = a.byCategory.slice(0, 8).map((c) => ({ name: c.name, value: c.amount, color: c.color }))
  const savingsRate = a.totals.income > 0 ? Math.round(((a.totals.income - a.totals.expense) / a.totals.income) * 100) : null

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Select value={month} onValueChange={onMonthChange}>
          <SelectTrigger className="min-h-11 rounded-xl w-[190px]" aria-label="Insights month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((m) => (
              <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          {savingsRate !== null && (
            <div className={`rounded-xl border px-3.5 py-2 text-sm font-semibold flex items-center gap-1.5 ${savingsRate >= 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
              {savingsRate >= 0 ? <TrendingUp className="size-4" aria-hidden="true" /> : <TrendingDown className="size-4" aria-hidden="true" />}
              {Math.abs(savingsRate)}% savings rate
            </div>
          )}
        </div>
      </div>

      {/* Rule-based alerts */}
      <section aria-label="Smart alerts">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 px-1">Smart alerts</h2>
        {insights.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nothing unusual detected — your spending looks steady this month.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((ins, i) => {
              const Icon = severityIcon[ins.severity] ?? Info
              return (
                <div key={i} className={`rounded-2xl border p-4 text-sm leading-relaxed ${severityStyle[ins.severity] ?? severityStyle.INFO}`} role="status">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Icon className="size-4 shrink-0" aria-hidden="true" /> {ins.title}
                  </p>
                  <p className="mt-1 opacity-90">{ins.message}</p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* AI monthly review */}
      <section aria-label="AI monthly review">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 px-1">AI monthly review</h2>
        <Card className="rounded-2xl shadow-sm border">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold flex items-center gap-1.5">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              {review ? review.title : `Review for ${monthLabel(month)}`}
            </CardTitle>
            <Button
              size="sm" onClick={generateReview} disabled={reviewBusy}
              className="rounded-lg gap-1.5 font-semibold"
              aria-label={review ? 'Regenerate AI review' : 'Generate AI review'}
            >
              {reviewBusy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : review ? <RefreshCw className="size-3.5" aria-hidden="true" /> : <Sparkles className="size-3.5" aria-hidden="true" />}
              {review ? 'Regenerate' : 'Generate'}
            </Button>
          </CardHeader>
          <CardContent>
            {reviewBusy && (
              <div className="space-y-2" aria-live="polite">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Reading your month and writing it up…
                </p>
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-11/12 rounded-md" />
                <Skeleton className="h-4 w-4/5 rounded-md" />
              </div>
            )}
            {!reviewBusy && reviewError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3.5 py-2.5" role="alert">{reviewError}</p>
            )}
            {!reviewBusy && !reviewError && !review && (
              <p className="text-sm text-muted-foreground">
                Have the AI read your month: what happened, what stands out, and one concrete move for next month — in plain language, based only on your real numbers.
              </p>
            )}
            {!reviewBusy && review && (
              <div className="text-sm leading-relaxed space-y-2 prose-sm max-w-none">
                {review.message.split('\n').filter(Boolean).map((line, i) => {
                  const html = line
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                  return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Chart gallery */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-label="Charts">
        <Card className="rounded-2xl shadow-sm border">
          <CardHeader className="pb-1">
            <CardTitle className="text-base font-semibold">Category share — {monthLabel(month)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <DonutChart data={donutData} currency={user.baseCurrency} />
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm border">
          <CardHeader className="pb-1">
            <CardTitle className="text-base font-semibold">Cashflow — last 12 weeks</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <CashflowChart data={a.cashflow90} currency={user.baseCurrency} />
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Key numbers">
        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Busiest category</p>
            <p className="mt-1 font-bold text-lg">{a.byCategory[0]?.name ?? '—'}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {a.byCategory[0] ? `${money(a.byCategory[0].amount, a.baseCurrency)} · ${Math.round(a.byCategory[0].pct)}% of spending` : 'No data yet'}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Top merchant</p>
            <p className="mt-1 font-bold text-lg truncate">{a.topMerchant?.name ?? '—'}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{a.topMerchant ? money(a.topMerchant.amount, a.baseCurrency) : 'No merchant data yet'}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">No-spend streak</p>
            <p className="mt-1 font-bold text-lg">{a.streak.activeDays} day{a.streak.activeDays !== 1 ? 's' : ''}</p>
            <p className="text-xs text-muted-foreground">{a.streak.activeDays >= 2 ? 'Keep it rolling.' : 'Any expense-free day counts.'}</p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
