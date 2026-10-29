'use client'
// Welcome / sign-in / sign-up screen — fintech clean, accessible

import { useState } from 'react'
import { Wallet, Loader2, Sparkles, ShieldCheck, TrendingUp, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, CURRENCIES, type User } from '@/lib/client'

export function AuthView() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState<'form' | 'demo' | null>(null)
  const [error, setError] = useState<string | null>(null)

  // form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [seedSample, setSeedSample] = useState(true)

  function finish() {
    // Full reload guarantees the app boots with the fresh session cookie
    window.location.reload()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading('form')
    try {
      if (mode === 'login') {
        await api<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      } else {
        await api<{ user: User }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, name, baseCurrency: currency, seedSample }),
        })
      }
      finish()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(null)
    }
  }

  async function tryDemo() {
    setError(null)
    setLoading('demo')
    try {
      await api<{ user: User }>('/api/auth/register') // GET = instant demo session
      finish()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the demo.')
      setLoading(null)
    }
  }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Brand panel */}
      <section className="lg:w-[46%] bg-primary text-primary-foreground px-6 sm:px-10 lg:px-14 py-10 lg:py-16 flex flex-col justify-between relative overflow-hidden" aria-label="About FinTrack AI">
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-white/5" aria-hidden="true" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="size-11 rounded-2xl bg-white/15 grid place-items-center">
              <Wallet className="size-6" aria-hidden="true" />
            </span>
            <span className="text-2xl font-bold tracking-tight">FinTrack AI</span>
          </div>
          <h1 className="mt-10 text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-tight max-w-lg">
            Know where every unit of your money goes — and where it should go next.
          </h1>
          <p className="mt-4 text-white/85 max-w-md text-[15px] leading-relaxed">
            Track expenses in 10 currencies, set budgets that warn you before you overspend, fund savings goals, and get plain-language AI insights every month.
          </p>
          <ul className="mt-8 space-y-4 max-w-md">
            {[
              { icon: Sparkles, title: 'AI auto-categorization', desc: 'Type “Uber to airport” — the category fills itself in.' },
              { icon: ShieldCheck, title: 'Safe-to-spend daily number', desc: 'One figure that tells you what today can handle.' },
              { icon: TrendingUp, title: 'Insights that actually help', desc: 'Anomaly flags and a monthly review in plain words.' },
            ].map((f) => (
              <li key={f.title} className="flex gap-3.5">
                <span className="mt-0.5 size-9 shrink-0 rounded-xl bg-white/15 grid place-items-center">
                  <f.icon className="size-4.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-[15px]">{f.title}</p>
                  <p className="text-sm text-white/75">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-10 text-sm text-white/60">
          Private by design — your data is yours alone, secured per account.
        </p>
      </section>

      {/* Form panel */}
      <section className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10" aria-label="Sign in or create an account">
        <div className="w-full max-w-md">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-muted mb-7" role="tablist" aria-label="Choose sign in or sign up">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => { setMode(m); setError(null) }}
                className={`min-h-11 rounded-xl text-sm font-semibold transition-colors ${mode === m ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" autoComplete="name" required minLength={1} className="min-h-11 rounded-xl" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required className="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 8 : 1} className="min-h-11 rounded-xl" />
              {mode === 'register' && password.length > 0 && password.length < 8 && (
                <p className="text-xs text-destructive" role="alert">Password needs at least 8 characters.</p>
              )}
            </div>

            {mode === 'register' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="currency">
                    <span className="inline-flex items-center gap-1.5"><Languages className="size-3.5" aria-hidden="true" /> Main currency</span>
                  </Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="currency" className="min-h-11 rounded-xl w-full" aria-label="Main currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">You can still record entries in any of the 10 currencies later.</p>
                </div>
                <label className="flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer hover:bg-muted/50 transition-colors">
                  <Checkbox checked={seedSample} onCheckedChange={(v) => setSeedSample(v === true)} className="mt-0.5" aria-label="Load 90 days of sample data" />
                  <span className="text-sm">
                    <span className="font-medium">Start with 90 days of sample data</span>
                    <span className="block text-muted-foreground text-[13px]">Explore budgets, goals and insights instantly. Clear them anytime in Settings.</span>
                  </span>
                </label>
              </>
            )}

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3.5 py-2.5" role="alert">{error}</p>
            )}

            <Button type="submit" disabled={loading !== null} className="w-full min-h-11 rounded-xl text-[15px] font-semibold">
              {loading === 'form' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {mode === 'login' ? 'Sign in' : 'Create my account'}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-6" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" onClick={tryDemo} disabled={loading !== null} className="w-full min-h-11 rounded-xl font-semibold">
            {loading === 'demo' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            <Sparkles className="size-4" aria-hidden="true" />
            Explore with the demo account
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Demo comes preloaded with 3 months of realistic activity — no signup needed.
          </p>
        </div>
      </section>
    </main>
  )
}
