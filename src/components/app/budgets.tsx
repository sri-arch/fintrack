'use client'
// Budgets: monthly caps per category with progress and alert states

import { useEffect, useMemo, useState } from 'react'
import { Plus, Info, TriangleAlert, CheckCircle2, Loader2, Trash2, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AppIcon } from './app-icon'
import { api, money, monthLabel, type Analytics, type Budget, type Category, type User } from '@/lib/client'

interface Props {
  user: User
  budgets: Budget[] | undefined
  analytics: Analytics | undefined
  categories: Category[]
  loading: boolean
  onChanged: () => void
}

export function BudgetsView({ user, budgets, analytics, categories, loading, onChanged }: Props) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [month, setMonth] = useState<string | null>(null)

  const currentMonth = analytics?.month ?? new Date().toISOString().slice(0, 7)
  const activeMonth = month ?? currentMonth
  const base = user.baseCurrency

  const expenseCats = useMemo(() => categories.filter((c) => c.type === 'EXPENSE'), [categories])
  const statusByCat = useMemo(() => new Map((analytics?.budgetStatus ?? []).map((b) => [b.categoryId, b])), [analytics])

  // month options: last 6 months
  const monthOptions = useMemo(() => {
    const out: string[] = []
    const d = new Date()
    for (let i = 0; i < 6; i++) {
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      d.setMonth(d.getMonth() - 1)
    }
    return out
  }, [])

  const monthBudgets = useMemo(() => (budgets ?? []).filter((b) => b.month === activeMonth), [budgets, activeMonth])
  const totalBudgeted = monthBudgets.reduce((s, b) => s + b.amount, 0)

  useEffect(() => {
    if (open) {
      setError(null)
      if (editing) {
        setCategoryId(editing.categoryId)
        setAmount(String(editing.amount))
      } else {
        setCategoryId('')
        setAmount('')
      }
    }
  }, [open, editing])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amt = Number(amount)
    if (!categoryId) {
      setError('Choose a category for this budget.')
      return
    }
    if (!isFinite(amt) || amt < 0) {
      setError('Enter a valid amount (0 removes the budget).')
      return
    }
    setSaving(true)
    try {
      await api('/api/budgets', { method: 'PUT', body: JSON.stringify({ categoryId, amount: amt, month: activeMonth }) })
      setOpen(false)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the budget.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(b: Budget) {
    setSaving(true)
    try {
      await api('/api/budgets', { method: 'PUT', body: JSON.stringify({ categoryId: b.categoryId, amount: 0, month: b.month }) })
      setOpen(false)
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  const unbudgeted = expenseCats.filter((c) => !monthBudgets.some((b) => b.categoryId === c.id))

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={activeMonth} onValueChange={setMonth}>
            <SelectTrigger className="min-h-11 rounded-xl w-[190px]" aria-label="Budget month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true) }} className="min-h-11 rounded-xl font-semibold">
          <Plus className="size-4" aria-hidden="true" /> Set a budget
        </Button>
      </div>

      <Card className="rounded-2xl shadow-sm border">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">Total budgeted for {monthLabel(activeMonth)}</p>
            <p className="text-2xl font-bold tabular-nums mt-0.5">{money(totalBudgeted, base)}</p>
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5 sm:max-w-xs">
            <Info className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            Budgets power your safe-to-spend number and the alerts you see on the dashboard. Aim to cover your flexible spending categories first.
          </p>
        </CardContent>
      </Card>

      {monthBudgets.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-14 text-center">
            <p className="font-semibold">No budgets for {monthLabel(activeMonth)}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Start with the categories where money slips away fastest — food, shopping, entertainment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3" aria-label="Budget list">
          {monthBudgets.map((b) => {
            const st = statusByCat.get(b.categoryId)
            const spent = st?.spent ?? 0
            const pct = st?.pct ?? 0
            const state = st?.status ?? 'ok'
            return (
              <li key={b.id}>
                <Card
                  className={`rounded-2xl shadow-sm border transition-colors ${
                    state === 'over' ? 'border-rose-300 bg-rose-50/50' : state === 'warn' ? 'border-amber-200 bg-amber-50/40' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="size-10 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: `${b.category?.color ?? '#94a3b8'}1a` }}>
                        <AppIcon name={b.category?.icon ?? 'Tag'} className="size-5" style={{ color: b.category?.color ?? '#64748b' }} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{b.category?.name ?? 'Category'}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {money(spent, base)} of {money(b.amount, base)}
                          {state === 'over' && ` · ${money(spent - b.amount, base)} over`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {state === 'over' ? (
                          <TriangleAlert className="size-4 text-rose-500" aria-label="Budget exceeded" />
                        ) : state === 'warn' ? (
                          <span className="text-xs font-semibold text-amber-600">{Math.round(pct)}%</span>
                        ) : (
                          pct >= 50 ? <span className="text-xs font-semibold text-muted-foreground">{Math.round(pct)}%</span> : <CheckCircle2 className="size-4 text-emerald-500" aria-label="On track" />
                        )}
                        <Button
                          variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditing(b); setOpen(true) }}
                          aria-label={`Edit ${b.category?.name} budget`}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                    <Progress
                      value={Math.min(pct, 100)}
                      className="h-2.5 mt-3"
                      aria-label={`${b.category?.name}: ${Math.round(pct)}% used`}
                    />
                    {state === 'over' && (
                      <p className="text-xs text-rose-600 mt-2 font-medium" role="alert">
                        Budget exceeded — {money(b.amount - spent, base)} beyond the cap.
                      </p>
                    )}
                    {state === 'warn' && (
                      <p className="text-xs text-amber-600 mt-2 font-medium" role="status">
                        {Math.round(100 - pct)}% left for the rest of the month.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {unbudgeted.length > 0 && monthBudgets.length > 0 && (
        <p className="text-xs text-muted-foreground px-1">
          Not budgeted yet: {unbudgeted.slice(0, 5).map((c) => c.name).join(', ')}{unbudgeted.length > 5 ? ` +${unbudgeted.length - 5} more` : ''}
        </p>
      )}

      {/* Create/edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl" aria-label={editing ? 'Edit budget' : 'Set a budget'}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit budget' : 'Set a budget'}</DialogTitle>
            <DialogDescription>
              A monthly cap for one category, in your base currency ({base}). You will get a nudge at 80% and a clear warning at 100%.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="budget-cat">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId} disabled={Boolean(editing)}>
                <SelectTrigger id="budget-cat" className="min-h-11 rounded-xl w-full" aria-label="Budget category">
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="size-4 rounded-md grid place-items-center" style={{ backgroundColor: `${c.color}1a` }}>
                          <AppIcon name={c.icon} className="size-3" style={{ color: c.color }} />
                        </span>
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget-amount">Monthly limit ({base})</Label>
              <Input
                id="budget-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 400" required className="min-h-11 rounded-xl tabular-nums"
              />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3.5 py-2.5" role="alert">{error}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              {editing && (
                <Button type="button" variant="ghost" onClick={() => remove(editing)} disabled={saving} className="rounded-xl text-destructive hover:text-destructive">
                  <Trash2 className="size-4" aria-hidden="true" /> Remove
                </Button>
              )}
              <Button type="submit" disabled={saving} className="rounded-xl min-h-11 px-6 font-semibold">
                {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {editing ? 'Save changes' : 'Set budget'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
