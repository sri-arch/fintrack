'use client'
// Transactions: searchable, filterable list with inline edit/delete

import { useMemo, useState } from 'react'
import { Search, Plus, Pencil, ArrowUpDown, FilterX } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AppIcon } from './app-icon'
import { TransactionDialog } from './transaction-dialog'
import { api, fmtDate, money, type Category, type Transaction, type User } from '@/lib/client'

interface Props {
  user: User
  categories: Category[]
  transactions: Transaction[] | undefined
  loading: boolean
  onChanged: () => void
  prefillOpen?: boolean
  onPrefillConsumed?: () => void
}

export function TransactionsView({ user, categories, transactions, loading, onChanged, prefillOpen, onPrefillConsumed }: Props) {
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [sort, setSort] = useState<'date-desc' | 'date-asc' | 'amount-desc'>('date-desc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const filtered = useMemo(() => {
    let list = transactions ?? []
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(needle) ||
          (t.merchant ?? '').toLowerCase().includes(needle) ||
          (t.notes ?? '').toLowerCase().includes(needle) ||
          (catById.get(t.categoryId ?? '')?.name.toLowerCase().includes(needle) ?? false)
      )
    }
    if (typeFilter !== 'all') list = list.filter((t) => t.type === typeFilter)
    if (catFilter !== 'all') list = list.filter((t) => t.categoryId === catFilter)
    const sorted = [...list]
    if (sort === 'date-desc') sorted.sort((a, b) => +new Date(b.date) - +new Date(a.date))
    if (sort === 'date-asc') sorted.sort((a, b) => +new Date(a.date) - +new Date(b.date))
    if (sort === 'amount-desc') sorted.sort((a, b) => b.amount - a.amount)
    return sorted
  }, [transactions, q, typeFilter, catFilter, sort, catById])

  const hasFilters = q.trim() !== '' || typeFilter !== 'all' || catFilter !== 'all'

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(t: Transaction) {
    setEditing(t)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search descriptions, merchants, notes…"
              className="pl-9 min-h-11 rounded-xl"
              aria-label="Search transactions"
            />
          </div>
          <Button onClick={openAdd} className="min-h-11 rounded-xl px-4 font-semibold shrink-0">
            <Plus className="size-4" aria-hidden="true" /> Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="min-h-10 rounded-xl w-[140px]" aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="EXPENSE">Money out</SelectItem>
              <SelectItem value="INCOME">Money in</SelectItem>
            </SelectContent>
          </Select>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="min-h-10 rounded-xl w-[180px]" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="min-h-10 rounded-xl w-[160px]" aria-label="Sort order">
              <span className="flex items-center gap-1.5"><ArrowUpDown className="size-3.5" aria-hidden="true" /><SelectValue /></span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest first</SelectItem>
              <SelectItem value="date-asc">Oldest first</SelectItem>
              <SelectItem value="amount-desc">Largest amount</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setQ(''); setTypeFilter('all'); setCatFilter('all') }} className="min-h-10 rounded-xl text-muted-foreground">
              <FilterX className="size-3.5" aria-hidden="true" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-14 text-center">
            <p className="font-semibold">No entries found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasFilters ? 'Try clearing the filters above.' : 'Add your first entry with the button above.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2" aria-label="Transaction list">
          {filtered.map((t) => {
            const cat = t.categoryId ? catById.get(t.categoryId) : null
            return (
              <li key={t.id}>
                <Card className="rounded-2xl shadow-sm border hover:shadow transition-shadow">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <span
                      className="size-10 rounded-xl grid place-items-center shrink-0"
                      style={{ backgroundColor: `${cat?.color ?? '#94a3b8'}1a` }}
                      aria-hidden="true"
                    >
                      <AppIcon name={cat?.icon ?? 'CircleEllipsis'} className="size-5" style={{ color: cat?.color ?? '#64748b' }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate flex items-center gap-2">
                        {t.description}
                        {t.aiCategorized && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 rounded-md font-medium text-primary bg-primary/10">AI</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {cat?.name ?? 'Uncategorized'} · {fmtDate(t.date)}
                        {t.merchant ? ` · ${t.merchant}` : ''}
                        {t.currency !== user.baseCurrency ? ` · ${money(t.amount, t.currency)} ${t.currency}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold tabular-nums ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-foreground'}`}>
                        {t.type === 'INCOME' ? '+' : '−'}{money(t.amount, t.currency)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-lg shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(t)}
                      aria-label={`Edit ${t.description}`}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </Button>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <TransactionDialog
        open={dialogOpen || Boolean(prefillOpen)}
        onOpenChange={(v) => {
          setDialogOpen(v)
          if (!v && prefillOpen) onPrefillConsumed?.()
        }}
        categories={categories}
        user={user}
        editing={editing}
        onSaved={() => { onChanged(); }}
        onDeleted={() => { onChanged(); }}
      />
    </div>
  )
}
