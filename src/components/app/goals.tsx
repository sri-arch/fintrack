'use client'
// Goals: savings jars with rings, contributions and target dates

import { useEffect, useState } from 'react'
import { Plus, Loader2, Trash2, Target, PartyPopper } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { AppIcon, ICON_NAMES } from './app-icon'
import { GoalRing } from './charts'
import { api, CURRENCIES, money, type Goal, type User } from '@/lib/client'

interface Props {
  user: User
  goals: Goal[] | undefined
  loading: boolean
  onChanged: () => void
}

export function GoalsView({ user, goals, loading, onChanged }: Props) {
  const [createOpen, setCreateOpen] = useState(false)
  const [contribGoal, setContribGoal] = useState<Goal | null>(null)
  const [contribAmount, setContribAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justCompleted, setJustCompleted] = useState<string | null>(null)

  // create form
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [currency, setCurrency] = useState(user.baseCurrency)
  const [icon, setIcon] = useState('Target')
  const [color, setColor] = useState('#10b981')
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (createOpen) {
      setName(''); setTarget(''); setCurrency(user.baseCurrency); setIcon('Target'); setColor('#10b981'); setTargetDate(undefined); setNote('')
      setError(null)
    }
  }, [createOpen, user.baseCurrency])

  useEffect(() => {
    if (contribGoal) { setContribAmount(''); setError(null) }
  }, [contribGoal])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const t = Number(target)
    if (!name.trim()) { setError('Give your goal a name you will recognize.'); return }
    if (!isFinite(t) || t <= 0) { setError('Target amount must be greater than zero.'); return }
    setSaving(true)
    try {
      await api('/api/goals', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(), targetAmount: t, currency, icon, color,
          targetDate: targetDate ? targetDate.toISOString() : null,
          note: note.trim() || null,
        }),
      })
      setCreateOpen(false)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the goal.')
    } finally {
      setSaving(false)
    }
  }

  async function contribute(e: React.FormEvent) {
    e.preventDefault()
    if (!contribGoal) return
    setError(null)
    const amt = Number(contribAmount)
    if (!isFinite(amt) || amt === 0) { setError('Enter an amount to add (or a negative number to withdraw).'); return }
    setSaving(true)
    try {
      const res = await api<{ goal: Goal }>(`/api/goals/${contribGoal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ contribute: amt }),
      })
      if (res.goal.status === 'COMPLETED' && contribGoal.status !== 'COMPLETED') {
        setJustCompleted(res.goal.name)
      }
      setContribGoal(null)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the goal.')
    } finally {
      setSaving(false)
    }
  }

  async function removeGoal(g: Goal) {
    setSaving(true)
    try {
      await api(`/api/goals/${g.id}`, { method: 'DELETE' })
      setContribGoal(null)
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    )
  }

  const list = goals ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-lg">
          Goals turn “I should save” into a number you can watch grow. Add to them whenever money comes in.
        </p>
        <Button onClick={() => setCreateOpen(true)} className="min-h-11 rounded-xl font-semibold shrink-0">
          <Plus className="size-4" aria-hidden="true" /> New goal
        </Button>
      </div>

      {list.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-14 text-center">
            <Target className="size-8 mx-auto text-muted-foreground" aria-hidden="true" />
            <p className="font-semibold mt-3">No goals yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Try an Emergency Fund first — it is the goal that protects all the others.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Goals list">
          {list.map((g) => {
            const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0
            const remaining = Math.max(g.targetAmount - g.currentAmount, 0)
            const eta = g.targetDate ? Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / (30 * 86400e3)) : null
            const monthlyNeeded = eta && eta > 0 ? remaining / eta : null
            return (
              <li key={g.id}>
                <Card className={`rounded-2xl shadow-sm border ${g.status === 'COMPLETED' ? 'border-emerald-300 bg-emerald-50/40' : ''}`}>
                  <CardContent className="p-5 flex gap-4">
                    <GoalRing pct={pct} color={g.color} label={g.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <AppIcon name={g.icon} className="size-4" style={{ color: g.color }} />
                        <p className="font-semibold truncate">{g.name}</p>
                        {g.status === 'COMPLETED' && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-0 hover:bg-emerald-100 text-[10px] rounded-md">
                            <PartyPopper className="size-3 mr-0.5" aria-hidden="true" /> Done
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-lg font-bold tabular-nums">
                        {money(g.currentAmount, g.currency)}
                        <span className="text-sm font-medium text-muted-foreground"> of {money(g.targetAmount, g.currency, { noDecimals: true })}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {remaining > 0 ? `${money(remaining, g.currency, { noDecimals: true })} to go` : 'Goal reached'}
                        {g.targetDate ? ` · target ${new Date(g.targetDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                        {monthlyNeeded ? ` · ~${money(monthlyNeeded, g.currency, { noDecimals: true })}/month needed` : ''}
                      </p>
                      {g.note && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{g.note}</p>}
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" onClick={() => setContribGoal(g)} className="rounded-lg min-h-9 px-3.5 text-xs font-semibold">
                          <Plus className="size-3.5" aria-hidden="true" /> Add money
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="rounded-lg min-h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                          onClick={async () => {
                            await api(`/api/goals/${g.id}`, { method: 'PATCH', body: JSON.stringify({ currentAmount: 0 }) })
                            onChanged()
                          }}
                          aria-label={`Reset ${g.name} progress`}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl max-h-[92vh] overflow-y-auto" aria-label="Create a savings goal">
          <DialogHeader>
            <DialogTitle>New savings goal</DialogTitle>
            <DialogDescription>What are you saving for? Naming it makes it real.</DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="goal-name">Goal name</Label>
              <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency Fund" required className="min-h-11 rounded-xl" />
            </div>
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="goal-target">Target amount</Label>
                <Input id="goal-target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 5000" required className="min-h-11 rounded-xl tabular-nums" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="goal-currency" className="min-h-11 rounded-xl" aria-label="Goal currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-date">Target date <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full min-h-11 rounded-xl justify-start font-normal" aria-label="Pick a target date">
                    {targetDate ? targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Pick a month'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={targetDate}
                    onSelect={setTargetDate}
                    disabled={(d) => d < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="goal-icon">Icon</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger id="goal-icon" className="min-h-11 rounded-xl" aria-label="Goal icon"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {ICON_NAMES.map((n) => (
                      <SelectItem key={n} value={n}>
                        <span className="inline-flex items-center gap-2"><AppIcon name={n} className="size-4" /> {n}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-1.5 pt-1.5" role="radiogroup" aria-label="Goal color">
                  {['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'].map((c) => (
                    <button
                      key={c} type="button" role="radio" aria-checked={color === c} aria-label={`Color ${c}`}
                      onClick={() => setColor(c)}
                      className={`size-7 rounded-lg transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-note">Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input id="goal-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this matters to you" className="min-h-11 rounded-xl" />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3.5 py-2.5" role="alert">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={saving} className="rounded-xl min-h-11 px-6 font-semibold w-full sm:w-auto">
                {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Create goal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contribute dialog */}
      <Dialog open={Boolean(contribGoal)} onOpenChange={(v) => !v && setContribGoal(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl" aria-label={`Add money to ${contribGoal?.name}`}>
          <DialogHeader>
            <DialogTitle>Add to {contribGoal?.name}</DialogTitle>
            <DialogDescription>
              Currently {contribGoal ? money(contribGoal.currentAmount, contribGoal.currency) : ''} of {contribGoal ? money(contribGoal.targetAmount, contribGoal.currency) : ''}. Use a negative amount to withdraw.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={contribute} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="contrib-amount">Amount ({contribGoal?.currency})</Label>
              <Input id="contrib-amount" inputMode="decimal" value={contribAmount} onChange={(e) => setContribAmount(e.target.value)} placeholder="e.g. 250" required autoFocus className="min-h-11 rounded-xl tabular-nums" />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3.5 py-2.5" role="alert">{error}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              {contribGoal && (
                <Button type="button" variant="ghost" onClick={() => removeGoal(contribGoal)} disabled={saving} className="rounded-xl text-destructive hover:text-destructive">
                  <Trash2 className="size-4" aria-hidden="true" /> Delete goal
                </Button>
              )}
              <Button type="submit" disabled={saving} className="rounded-xl min-h-11 px-6 font-semibold">
                {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Celebration */}
      <Dialog open={Boolean(justCompleted)} onOpenChange={(v) => !v && setJustCompleted(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl text-center" aria-label="Goal completed">
          <div className="py-6">
            <PartyPopper className="size-12 mx-auto text-emerald-500" aria-hidden="true" />
            <h2 className="text-xl font-bold mt-4">Goal reached!</h2>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-semibold text-foreground">{justCompleted}</span> is fully funded. Take a moment — this is what consistency looks like.
            </p>
            <Button onClick={() => setJustCompleted(null)} className="mt-5 rounded-xl px-8">Wonderful</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
