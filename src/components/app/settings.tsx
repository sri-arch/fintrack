'use client'
// Settings: profile, base currency, exchange rates, category manager, data controls

import { useState } from 'react'
import { Loader2, Plus, Pencil, Trash2, Check, X, Globe, Tags, Database, UserRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AppIcon, ICON_NAMES } from './app-icon'
import { api, CURRENCIES, type Category, type User } from '@/lib/client'

const COLORS = ['#f97316', '#22c55e', '#0ea5e9', '#64748b', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#ef4444', '#eab308', '#06b6d4', '#d946ef', '#f59e0b', '#94a3b8', '#10b981', '#34d399', '#84cc16']

interface Props {
  user: User
  categories: Category[]
  onUserChanged: (u: User) => void
  onChanged: () => void
}

export function SettingsView({ user, categories, onUserChanged, onChanged }: Props) {
  const [name, setName] = useState(user.name)
  const [baseCurrency, setBaseCurrency] = useState(user.baseCurrency)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [rates, setRates] = useState<Record<string, string>>(() => {
    try {
      const parsed = user.rates ? (JSON.parse(user.rates) as Record<string, number>) : {}
      return Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)]))
    } catch {
      return {}
    }
  })
  const [savingRates, setSavingRates] = useState(false)
  const [ratesSaved, setRatesSaved] = useState(false)

  // Category editor state
  const [catOpen, setCatOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [catName, setCatName] = useState('')
  const [catIcon, setCatIcon] = useState('Tag')
  const [catColor, setCatColor] = useState(COLORS[0])
  const [catType, setCatType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  const [catSaving, setCatSaving] = useState(false)
  const [catError, setCatError] = useState<string | null>(null)
  const [deletingCat, setDeletingCat] = useState<Category | null>(null)

  const [clearBusy, setClearBusy] = useState<string | null>(null)

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    setProfileSaved(false)
    try {
      const res = await api<{ user: User }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ name, baseCurrency }),
      })
      onUserChanged(res.user)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } finally {
      setSavingProfile(false)
    }
  }

  async function saveRates(e: React.FormEvent) {
    e.preventDefault()
    setSavingRates(true)
    setRatesSaved(false)
    try {
      const clean: Record<string, number> = {}
      for (const [code, val] of Object.entries(rates)) {
        const n = Number(val)
        if (val.trim() !== '' && isFinite(n) && n > 0) clean[code] = n
      }
      const res = await api<{ user: User }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ rates: clean }),
      })
      onUserChanged(res.user)
      setRatesSaved(true)
      setTimeout(() => setRatesSaved(false), 2500)
    } finally {
      setSavingRates(false)
    }
  }

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault()
    setCatError(null)
    if (!catName.trim()) { setCatError('Category needs a name.'); return }
    setCatSaving(true)
    try {
      if (editingCat) {
        await api(`/api/categories/${editingCat.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: catName.trim(), icon: catIcon, color: catColor }),
        })
      } else {
        await api('/api/categories', {
          method: 'POST',
          body: JSON.stringify({ name: catName.trim(), icon: catIcon, color: catColor, type: catType }),
        })
      }
      setCatOpen(false)
      onChanged()
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Could not save the category.')
    } finally {
      setCatSaving(false)
    }
  }

  async function deleteCategory(cat: Category) {
    setCatSaving(true)
    try {
      await api(`/api/categories/${cat.id}`, { method: 'DELETE' })
      setDeletingCat(null)
      onChanged()
    } finally {
      setCatSaving(false)
    }
  }

  async function clearData(action: string, label: string) {
    setClearBusy(action)
    try {
      await api('/api/settings', { method: 'DELETE', body: JSON.stringify({ action }) })
      onChanged()
    } finally {
      setClearBusy(null)
    }
  }

  const expenseCats = categories.filter((c) => c.type === 'EXPENSE')
  const incomeCats = categories.filter((c) => c.type === 'INCOME')

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Profile */}
      <Card className="rounded-2xl shadow-sm border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-1.5">
            <UserRound className="size-4 text-primary" aria-hidden="true" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="grid grid-cols-1 sm:grid-cols-[1fr_170px_auto] gap-3 items-end" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="set-name">Display name</Label>
              <Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} required className="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="set-currency">
                <span className="inline-flex items-center gap-1.5"><Globe className="size-3.5" aria-hidden="true" /> Base currency</span>
              </Label>
              <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                <SelectTrigger id="set-currency" className="min-h-11 rounded-xl" aria-label="Base currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={savingProfile} className="min-h-11 rounded-xl font-semibold">
              {savingProfile ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : profileSaved ? <Check className="size-4" aria-hidden="true" /> : null}
              {profileSaved ? 'Saved' : 'Save'}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-3">
            Entries recorded in other currencies are converted into your base currency for totals, budgets and safe-to-spend.
          </p>
        </CardContent>
      </Card>

      {/* Exchange rates */}
      <Card className="rounded-2xl shadow-sm border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Exchange rates</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveRates} className="space-y-3" noValidate>
            <p className="text-xs text-muted-foreground">
              Units of each currency per 1 {user.baseCurrency}. Leave blank to use the built-in defaults.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {CURRENCIES.filter((c) => c.code !== user.baseCurrency).map((c) => (
                <div key={c.code} className="space-y-1">
                  <Label htmlFor={`rate-${c.code}`} className="text-xs">{c.code}</Label>
                  <Input
                    id={`rate-${c.code}`}
                    inputMode="decimal"
                    value={rates[c.code] ?? ''}
                    onChange={(e) => setRates((r) => ({ ...r, [c.code]: e.target.value }))}
                    placeholder={String(c.rateFromUSD)}
                    className="min-h-10 rounded-lg tabular-nums"
                  />
                </div>
              ))}
            </div>
            <Button type="submit" disabled={savingRates} className="rounded-xl min-h-10 font-semibold">
              {savingRates ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : ratesSaved ? <Check className="size-4" aria-hidden="true" /> : null}
              {ratesSaved ? 'Saved' : 'Save rates'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card className="rounded-2xl shadow-sm border">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold flex items-center gap-1.5">
            <Tags className="size-4 text-primary" aria-hidden="true" /> Categories
          </CardTitle>
          <Button
            size="sm" className="rounded-lg font-semibold"
            onClick={() => { setEditingCat(null); setCatName(''); setCatIcon('Tag'); setCatColor(COLORS[0]); setCatType('EXPENSE'); setCatOpen(true) }}
          >
            <Plus className="size-3.5" aria-hidden="true" /> New
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {[['Money out', expenseCats], ['Money in', incomeCats]].map(([label, list]) => (
            <div key={label as string}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{label as string}</p>
              <ul className="flex flex-wrap gap-2">
                {(list as Category[]).map((c) => (
                  <li key={c.id} className="group">
                    <span className="inline-flex items-center gap-1.5 rounded-xl border py-1.5 pl-2.5 pr-1.5 text-sm bg-card hover:shadow-sm transition-shadow">
                      <span className="size-5 rounded-md grid place-items-center" style={{ backgroundColor: `${c.color}1a` }}>
                        <AppIcon name={c.icon} className="size-3" style={{ color: c.color }} />
                      </span>
                      {c.name}
                      {c.isSystem && <Badge variant="secondary" className="text-[9px] px-1 h-3.5 rounded">built-in</Badge>}
                      <button
                        className="size-6 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => { setEditingCat(c); setCatName(c.name); setCatIcon(c.icon); setCatColor(c.color); setCatType(c.type); setCatOpen(true) }}
                        aria-label={`Edit ${c.name}`}
                      >
                        <Pencil className="size-3" aria-hidden="true" />
                      </button>
                      <button
                        className="size-6 grid place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted"
                        onClick={() => setDeletingCat(c)}
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Data controls */}
      <Card className="rounded-2xl shadow-sm border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-1.5">
            <Database className="size-4 text-primary" aria-hidden="true" /> Your data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Started with sample data and want a clean slate? These clear everything in one go.</p>
          <Separator />
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="outline" className="rounded-xl"
              disabled={clearBusy !== null}
              onClick={() => clearData('clearTransactions', 'transactions')}
            >
              {clearBusy === 'clearTransactions' ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Clear all entries
            </Button>
            <Button
              variant="outline" className="rounded-xl"
              disabled={clearBusy !== null}
              onClick={() => clearData('clearBudgets', 'budgets')}
            >
              {clearBusy === 'clearBudgets' ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Clear budgets
            </Button>
            <Button
              variant="outline" className="rounded-xl text-destructive border-rose-200 hover:bg-rose-50 hover:text-destructive"
              disabled={clearBusy !== null}
              onClick={() => clearData('clearAll', 'everything')}
            >
              {clearBusy === 'clearAll' ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Delete everything
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl" aria-label={editingCat ? 'Edit category' : 'New category'}>
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Edit category' : 'New category'}</DialogTitle>
            <DialogDescription>Short, recognizable names work best. Pick an icon and color you will spot instantly.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveCategory} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input id="cat-name" value={catName} onChange={(e) => setCatName(e.target.value)} required className="min-h-11 rounded-xl" placeholder="e.g. Coffee" />
            </div>
            {!editingCat && (
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={catType} onValueChange={(v) => setCatType(v as 'EXPENSE' | 'INCOME')}>
                  <SelectTrigger className="min-h-11 rounded-xl" aria-label="Category type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Money out</SelectItem>
                    <SelectItem value="INCOME">Money in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <div className="grid grid-cols-8 gap-1.5 max-h-36 overflow-y-auto p-1" role="radiogroup" aria-label="Category icon">
                {ICON_NAMES.map((n) => (
                  <button
                    key={n} type="button" role="radio" aria-checked={catIcon === n} aria-label={n}
                    onClick={() => setCatIcon(n)}
                    className={`size-9 rounded-lg grid place-items-center border transition-colors ${catIcon === n ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'}`}
                  >
                    <AppIcon name={n} className="size-4" />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Category color">
                {COLORS.map((c) => (
                  <button
                    key={c} type="button" role="radio" aria-checked={catColor === c} aria-label={`Color ${c}`}
                    onClick={() => setCatColor(c)}
                    className={`size-7 rounded-lg transition-transform ${catColor === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            {catError && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3.5 py-2.5" role="alert">{catError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={catSaving} className="rounded-xl min-h-11 px-6 font-semibold w-full sm:w-auto">
                {catSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {editingCat ? 'Save changes' : 'Create category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete category confirm */}
      <Dialog open={Boolean(deletingCat)} onOpenChange={(v) => !v && setDeletingCat(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl" aria-label="Delete category">
          <DialogHeader>
            <DialogTitle>Delete “{deletingCat?.name}”?</DialogTitle>
            <DialogDescription>
              Its entries will move to the fallback category for {deletingCat?.type === 'INCOME' ? 'income' : 'expenses'}. Its budgets will be removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeletingCat(null)} className="rounded-xl">
              <X className="size-4" aria-hidden="true" /> Cancel
            </Button>
            <Button variant="destructive" onClick={() => deletingCat && deleteCategory(deletingCat)} disabled={catSaving} className="rounded-xl">
              {catSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
