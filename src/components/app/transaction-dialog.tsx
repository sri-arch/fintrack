'use client'
// Add / edit transaction dialog with AI category suggestion

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Sparkles, Trash2, Wand2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { AppIcon } from './app-icon'
import { api, CURRENCIES, type Category, type Transaction, type User } from '@/lib/client'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  categories: Category[]
  user: User
  editing?: Transaction | null
  onSaved: () => void
  onDeleted?: () => void
}

export function TransactionDialog({ open, onOpenChange, categories, user, editing, onSaved, onDeleted }: Props) {
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(user.baseCurrency)
  const [description, setDescription] = useState('')
  const [merchant, setMerchant] = useState('')
  const [notes, setNotes] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [date, setDate] = useState<Date>(new Date())
  const [saving, setSaving] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiNote, setAiNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const relevantCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  )

  useEffect(() => {
    if (open) {
      if (editing) {
        setType(editing.type)
        setAmount(String(editing.amount))
        setCurrency(editing.currency)
        setDescription(editing.description)
        setMerchant(editing.merchant ?? '')
        setNotes(editing.notes ?? '')
        setCategoryId(editing.categoryId ?? '')
        setDate(new Date(editing.date))
      } else {
        setType('EXPENSE')
        setAmount('')
        setCurrency(user.baseCurrency)
        setDescription('')
        setMerchant('')
        setNotes('')
        setCategoryId('')
        setDate(new Date())
      }
      setAiNote(null)
      setError(null)
      setConfirmDelete(false)
    }
  }, [open, editing, user.baseCurrency])

  // Auto-suggest a category via AI when description has enough signal and none chosen yet
  useEffect(() => {
    if (!open || editing) return
    const text = description.trim()
    if (text.length < 3 || categoryId) return
    const t = setTimeout(async () => {
      setAiBusy(true)
      try {
        const res = await api<{ suggestion: { categoryId: string | null; categoryName: string | null; confidence: string; source: string } | null }>(
          '/api/ai/categorize',
          { method: 'POST', body: JSON.stringify({ description: text, merchant, type }) }
        )
        if (res.suggestion?.categoryId && !categoryId) {
          setCategoryId(res.suggestion.categoryId)
          setAiNote(
            res.suggestion.source === 'ai'
              ? `AI suggests ${res.suggestion.categoryName}`
              : `Suggested ${res.suggestion.categoryName}`
          )
        }
      } catch {
        // silent — suggestion is best-effort
      } finally {
        setAiBusy(false)
      }
    }, 650)
    return () => clearTimeout(t)
  }, [description, open, editing])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amt = Number(amount)
    if (!isFinite(amt) || amt <= 0) {
      setError('Please enter an amount greater than zero.')
      return
    }
    if (!description.trim()) {
      setError('A short description helps you remember this entry later.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        type,
        amount: amt,
        currency,
        description: description.trim(),
        merchant: merchant.trim() || null,
        notes: notes.trim() || null,
        categoryId: categoryId || null,
        date: date.toISOString(),
        aiCategorized: Boolean(aiNote),
      }
      if (editing) {
        await api(`/api/transactions/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        await api('/api/transactions', { method: 'POST', body: JSON.stringify(payload) })
      }
      onOpenChange(false)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!editing) return
    setSaving(true)
    try {
      await api(`/api/transactions/${editing.id}`, { method: 'DELETE' })
      onOpenChange(false)
      onDeleted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl" role="dialog" aria-label={editing ? 'Edit transaction' : 'Add transaction'}>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit entry' : 'Add an entry'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Update the details below.' : 'Money out or money in — the AI will suggest the right category as you type.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-4" noValidate>
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted" role="tablist" aria-label="Entry type">
            {(['EXPENSE', 'INCOME'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={type === t}
                onClick={() => { setType(t); setCategoryId(''); setAiNote(null) }}
                className={cn(
                  'min-h-10 rounded-lg text-sm font-semibold transition-colors',
                  type === t
                    ? t === 'EXPENSE' ? 'bg-card shadow-sm text-rose-600' : 'bg-card shadow-sm text-emerald-600'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t === 'EXPENSE' ? 'Money out' : 'Money in'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_130px] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input id="tx-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required className="min-h-11 rounded-xl tabular-nums text-base" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="tx-currency" className="min-h-11 rounded-xl" aria-label="Currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-description" className="flex items-center gap-1.5">
              Description
              {aiBusy && <Loader2 className="size-3.5 animate-spin text-primary" aria-label="AI is thinking" />}
            </Label>
            <Input id="tx-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type === 'EXPENSE' ? 'e.g. Uber to airport' : 'e.g. October salary'} required className="min-h-11 rounded-xl" />
            {aiNote && (
              <p className="text-xs text-primary flex items-center gap-1" role="status">
                <Sparkles className="size-3" aria-hidden="true" /> {aiNote}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-category">Category</Label>
            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setAiNote(null) }}>
              <SelectTrigger id="tx-category" className="min-h-11 rounded-xl w-full" aria-label="Category">
                <SelectValue placeholder={type === 'EXPENSE' ? 'Pick a category' : 'Pick an income source'} />
              </SelectTrigger>
              <SelectContent>
                {relevantCategories.map((c) => (
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-merchant">Merchant <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input id="tx-merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Uber" className="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full min-h-11 rounded-xl justify-start font-normal" aria-label={`Date: ${date.toLocaleDateString()}`}>
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} disabled={(d) => d > new Date()} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea id="tx-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything future-you should know" rows={2} className="rounded-xl" />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3.5 py-2.5" role="alert">{error}</p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {editing && (
              confirmDelete ? (
                <Button type="button" variant="destructive" onClick={remove} disabled={saving} className="rounded-xl">
                  <Trash2 className="size-4" aria-hidden="true" /> Really delete
                </Button>
              ) : (
                <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)} className="rounded-xl text-destructive hover:text-destructive">
                  <Trash2 className="size-4" aria-hidden="true" /> Delete
                </Button>
              )
            )}
            <Button type="submit" disabled={saving} className="rounded-xl min-h-11 px-6 font-semibold">
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Wand2 className="size-4" aria-hidden="true" />}
              {editing ? 'Save changes' : 'Add entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
