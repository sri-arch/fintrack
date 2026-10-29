'use client'
// FinTrack app shell: adaptive navigation (sidebar on desktop, bottom tabs + FAB on mobile)

import { useEffect, useRef, useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard, ArrowLeftRight, PiggyBank, Target, Sparkles, Settings as SettingsIcon,
  Wallet, Plus, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { DashboardView } from './dashboard'
import { TransactionsView } from './transactions'
import { BudgetsView } from './budgets'
import { GoalsView } from './goals'
import { InsightsView } from './insights'
import { SettingsView } from './settings'
import { TransactionDialog } from './transaction-dialog'
import { api, monthLabel, type Analytics, type Budget, type Category, type Goal, type RuleInsight, type Transaction, type User } from '@/lib/client'

type Tab = 'dashboard' | 'transactions' | 'budgets' | 'goals' | 'insights' | 'settings'

const NAV: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard; mobile?: boolean }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, mobile: true },
  { id: 'transactions', label: 'Entries', icon: ArrowLeftRight, mobile: true },
  { id: 'budgets', label: 'Budgets', icon: PiggyBank, mobile: true },
  { id: 'goals', label: 'Goals', icon: Target, mobile: true },
  { id: 'insights', label: 'Insights', icon: Sparkles, mobile: true },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function FinTrackApp() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
  }))
  return (
    <QueryClientProvider client={queryClient}>
      <FinTrackInner />
    </QueryClientProvider>
  )
}

function FinTrackInner() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [insightsMonth, setInsightsMonth] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [addOpen, setAddOpen] = useState(false)
  const [prefillOpen, setPrefillOpen] = useState(false)
  const addFabRef = useRef<HTMLButtonElement | null>(null)

  // Session
  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: User | null }>('/api/auth/me'),
    staleTime: 60_000,
  })
  const user = me?.user ?? null

  // Data
  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: () => api<{ categories: Category[] }>('/api/categories'),
    enabled: Boolean(user),
  })
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', user?.id],
    queryFn: () => api<{ analytics: Analytics }>('/api/analytics'),
    enabled: Boolean(user),
  })
  const { data: budgetData } = useQuery({
    queryKey: ['budgets', user?.id],
    queryFn: () => api<{ budgets: Budget[] }>('/api/budgets'),
    enabled: Boolean(user),
  })
  const { data: goalData } = useQuery({
    queryKey: ['goals', user?.id],
    queryFn: () => api<{ goals: Goal[] }>('/api/goals'),
    enabled: Boolean(user),
  })
  const { data: recentData } = useQuery({
    queryKey: ['transactions', user?.id, 'recent'],
    queryFn: () => api<{ transactions: Transaction[] }>('/api/transactions?limit=12'),
    enabled: Boolean(user),
  })

  const { data: insightData } = useQuery({
    queryKey: ['ruleInsights', user?.id, insightsMonth],
    queryFn: () => api<{ insights: RuleInsight[] }>(`/api/insights?month=${insightsMonth}`),
    enabled: Boolean(user) && tab === 'insights',
    staleTime: 30_000,
  })

  function refreshAll() {
    qc.invalidateQueries({ queryKey: ['analytics'] })
    qc.invalidateQueries({ queryKey: ['transactions'] })
    qc.invalidateQueries({ queryKey: ['budgets'] })
    qc.invalidateQueries({ queryKey: ['goals'] })
    qc.invalidateQueries({ queryKey: ['ruleInsights'] })
  }

  const categories = catData?.categories ?? []

  // Dashboard rule insights: reuse ruleInsights query when month matches, else compute on current month lazily via separate query
  const currentMonthKey = analyticsData?.analytics.month ?? insightsMonth
  const { data: dashInsightData } = useQuery({
    queryKey: ['ruleInsights', user?.id, currentMonthKey],
    queryFn: () => api<{ insights: RuleInsight[] }>(`/api/insights?month=${currentMonthKey}`),
    enabled: Boolean(user) && tab === 'dashboard',
    staleTime: 30_000,
  })

  // Keyboard shortcut: "n" opens the add dialog
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!user) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setAddOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [user])

  const loading = meLoading || (Boolean(user) && (catLoading || analyticsLoading))

  if (meLoading) {
    return (
      <main className="min-h-screen grid place-items-center bg-background">
        <div className="text-center" role="status" aria-live="polite">
          <span className="mx-auto size-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center">
            <Wallet className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Loading FinTrack…
          </p>
        </div>
      </main>
    )
  }

  // Auto-login should guarantee a user; if it still failed (e.g. DB down), show a friendly retry state
  if (!user) {
    return (
      <main className="min-h-screen grid place-items-center bg-background">
        <div className="text-center" role="status" aria-live="polite">
          <span className="mx-auto size-12 rounded-2xl bg-primary text-primary-foreground grid place-items-center">
            <Wallet className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm text-muted-foreground">Could not start FinTrack. Please refresh the page.</p>
          <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </main>
    )
  }

  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  const dashboardInsights = dashInsightData?.insights ?? []
  const insightsList = insightData?.insights ?? dashInsightData?.insights ?? []

  return (
    <>
      <div className="min-h-screen flex bg-background">
        {/* Skip link for keyboard users */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-xl">
          Skip to main content
        </a>

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r bg-card" aria-label="Primary">
          <div className="px-5 py-5 flex items-center gap-2.5">
            <span className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center">
              <Wallet className="size-5" aria-hidden="true" />
            </span>
            <span className="font-bold text-lg tracking-tight">FinTrack AI</span>
          </div>
          <nav className="px-3 space-y-1 flex-1" aria-label="Main navigation">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                aria-current={tab === n.id ? 'page' : undefined}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-11',
                  tab === n.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <n.icon className="size-4.5" aria-hidden="true" />
                {n.label}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t">
            <div className="flex items-center gap-2.5 px-2 py-2">
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile top bar */}
          <header className="lg:hidden sticky top-0 z-40 bg-background/90 backdrop-blur border-b">
            <div className="flex items-center justify-between px-4 h-14">
              <div className="flex items-center gap-2">
                <span className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
                  <Wallet className="size-4" aria-hidden="true" />
                </span>
                <span className="font-bold tracking-tight">FinTrack AI</span>
              </div>
              <div className="flex items-center gap-1.5">
                {tab === 'insights' && (
                  <span className="text-xs text-muted-foreground mr-1">{monthLabel(insightsMonth)}</span>
                )}
                <Button
                  variant="ghost" size="icon" className="size-10 rounded-xl"
                  onClick={() => setTab('settings')}
                  aria-label="Settings"
                >
                  <SettingsIcon className="size-5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </header>

          <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 py-5 pb-28 lg:pb-8 w-full max-w-6xl mx-auto">
            {/* Desktop page header */}
            <div className="hidden lg:flex items-center justify-between mb-5">
              <h1 className="text-2xl font-bold tracking-tight capitalize">{tab === 'dashboard' ? 'Dashboard' : tab}</h1>
              <Button onClick={() => setAddOpen(true)} className="rounded-xl min-h-11 px-5 font-semibold">
                <Plus className="size-4" aria-hidden="true" /> Add entry
                <kbd className="ml-2 hidden xl:inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">N</kbd>
              </Button>
            </div>

            {tab === 'dashboard' && (
              <DashboardView
                user={user}
                analytics={analyticsData?.analytics}
                insights={dashboardInsights}
                recent={recentData?.transactions}
                categories={categories}
                loading={loading}
                onAdd={() => setAddOpen(true)}
                onGo={(t) => setTab(t)}
              />
            )}

            {tab === 'transactions' && (
              <TransactionsView
                user={user}
                categories={categories}
                transactions={recentData?.transactions}
                loading={loading}
                onChanged={refreshAll}
                prefillOpen={prefillOpen}
                onPrefillConsumed={() => setPrefillOpen(false)}
              />
            )}

            {tab === 'budgets' && (
              <BudgetsView
                user={user}
                budgets={budgetData?.budgets}
                analytics={analyticsData?.analytics}
                categories={categories}
                loading={loading}
                onChanged={refreshAll}
              />
            )}

            {tab === 'goals' && (
              <GoalsView
                user={user}
                goals={goalData?.goals}
                loading={loading}
                onChanged={refreshAll}
              />
            )}

            {tab === 'insights' && (
              <InsightsView
                user={user}
                analytics={analyticsData?.analytics}
                insights={insightsList}
                loading={loading}
                month={insightsMonth}
                onMonthChange={setInsightsMonth}
                onChanged={refreshAll}
              />
            )}

            {tab === 'settings' && (
              <SettingsView
                user={user}
                categories={categories}
                onUserChanged={(u) => qc.setQueryData(['me'], { user: u })}
                onChanged={refreshAll}
              />
            )}
          </main>
        </div>

        {/* Mobile bottom tabs */}
        <nav
          className={cn(
            'lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t',
            'pb-[env(safe-area-inset-bottom)]'
          )}
          aria-label="Bottom navigation"
        >
          <div className="grid grid-cols-6 h-16 items-center">
            {NAV.filter((n) => n.mobile).slice(0, 2).map((n) => (
              <TabButton key={n.id} n={n} active={tab === n.id} onClick={() => setTab(n.id)} />
            ))}
            <div className="flex justify-center">
              <button
                ref={addFabRef}
                onClick={() => setAddOpen(true)}
                className="size-14 -mt-6 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-lg shadow-primary/30 active:scale-95 transition-transform"
                aria-label="Add entry"
              >
                <Plus className="size-6" aria-hidden="true" />
              </button>
            </div>
            {NAV.filter((n) => n.mobile).slice(2).map((n) => (
              <TabButton key={n.id} n={n} active={tab === n.id} onClick={() => setTab(n.id)} />
            ))}
          </div>
        </nav>

        {/* Global add dialog */}
        <TransactionDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          categories={categories}
          user={user}
          editing={null}
          onSaved={refreshAll}
        />
      </div>
    </>
  )
}

function TabButton({ n, active, onClick }: { n: typeof NAV[number]; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'h-full flex flex-col items-center justify-center gap-1 text-[10px] font-medium min-h-12 transition-colors',
        active ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      <n.icon className="size-5" aria-hidden="true" />
      {n.label}
    </button>
  )
}
