'use client'
// Shared client-side types + fetch helpers + formatting

import { CURRENCIES, getCurrency, type RateMap } from '@/lib/currency'

export interface User {
  id: string
  email: string
  name: string
  baseCurrency: string
  rates?: string | null
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: 'EXPENSE' | 'INCOME'
  isSystem: boolean
  isDefault: boolean
  _count?: { transactions: number }
}

export interface Transaction {
  id: string
  type: 'EXPENSE' | 'INCOME'
  amount: number
  currency: string
  description: string
  merchant: string | null
  notes: string | null
  date: string
  categoryId: string | null
  aiCategorized: boolean
  category?: Category | null
}

export interface Budget {
  id: string
  categoryId: string
  amount: number
  month: string
  category?: Category
}

export interface Goal {
  id: string
  name: string
  icon: string
  color: string
  targetAmount: number
  currentAmount: number
  currency: string
  targetDate: string | null
  status: 'ACTIVE' | 'COMPLETED'
  note: string | null
}

export interface SafeToSpend {
  amount: number
  perDayBase: number
  daysLeft: number
  daysInMonth: number
}

export interface Analytics {
  month: string
  baseCurrency: string
  totals: { income: number; expense: number; net: number }
  prevTotals: { income: number; expense: number }
  byCategory: Array<{ categoryId: string | null; name: string; color: string; icon: string; amount: number; pct: number; count: number }>
  dailySeries: Array<{ day: string; expense: number; income: number }>
  cashflow90: Array<{ date: string; expense: number; income: number; net: number }>
  budgetStatus: Array<{ categoryId: string; name: string; color: string; icon: string; budgeted: number; spent: number; pct: number; status: 'ok' | 'warn' | 'over' }>
  budgetsTotal: number
  safeToSpend: SafeToSpend | null
  txCount: number
  topMerchant: { name: string; amount: number } | null
  streak: { activeDays: number; lastNoSpend: string | null }
}

export interface RuleInsight {
  type: 'ANOMALY' | 'BUDGET' | 'TREND' | 'TIP' | 'MILESTONE'
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL'
  title: string
  message: string
}

// ---------- Session token (iframe-safe auth) ----------
// Cookies can be blocked inside cross-site preview iframes, so the session token is
// also kept in localStorage and sent via the x-session-token header on every call.

const SESSION_KEY = 'fintrack_token'

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function storeToken(token: string): void {
  try {
    localStorage.setItem(SESSION_KEY, token)
  } catch {}
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {}
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken()
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-session-token': token } : {}),
      ...(init?.headers ?? {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? 'Something went wrong. Please try again.')
  }
  const sessionToken = (data as { sessionToken?: string }).sessionToken
  if (sessionToken) storeToken(sessionToken)
  return data as T
}

// ---------- Formatting ----------

export function parseRates(user?: User | null): RateMap | null {
  if (!user?.rates) return null
  try {
    return JSON.parse(user.rates)
  } catch {
    return null
  }
}

export function money(amount: number, currency: string, opts?: { compact?: boolean; noDecimals?: boolean }): string {
  const cur = getCurrency(currency)
  try {
    return new Intl.NumberFormat(cur.locale, {
      style: 'currency',
      currency: cur.code,
      notation: opts?.compact ? 'compact' : 'standard',
      maximumFractionDigits: opts?.noDecimals ? 0 : opts?.compact ? 1 : 2,
      minimumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${cur.symbol}${amount.toFixed(2)}`
  }
}

export function fmtDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(d, today)) return 'Today'
  if (sameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export { CURRENCIES }
