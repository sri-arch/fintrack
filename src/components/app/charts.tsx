'use client'
// Chart gallery: donut (category share), area (cashflow), bars (daily), ring (goal progress)

import { useMemo } from 'react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar,
} from 'recharts'
import { money } from '@/lib/client'

export function DonutChart({ data, currency, height = 260 }: {
  data: Array<{ name: string; value: number; color: string }>
  currency: string
  height?: number
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total <= 0) {
    return <div className="h-[260px] grid place-items-center text-sm text-muted-foreground">No spending recorded yet this month.</div>
  }
  return (
    <div style={{ height }} role="img" aria-label={`Spending by category, total ${money(total, currency)}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} strokeWidth={0}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <RTooltip
            formatter={(value: number, name: string) => [money(value, currency), name]}
            contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 13 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CashflowChart({ data, currency, height = 260 }: {
  data: Array<{ date: string; expense: number; income: number }>
  currency: string
  height?: number
}) {
  const fmtShort = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return (
    <div style={{ height }} role="img" aria-label="Income and expenses over the last 12 weeks">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtShort} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={54} tickFormatter={(v: number) => money(v, currency, { compact: true, noDecimals: true })} />
          <RTooltip
            labelFormatter={(l: string) => `Week of ${fmtShort(l)}`}
            formatter={(value: number, name: string) => [money(value, currency), name === 'income' ? 'Income' : 'Expense']}
            contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 13 }}
          />
          <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#gIncome)" name="income" />
          <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#gExpense)" name="expense" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DailyBarsChart({ data, currency, height = 240, today }: {
  data: Array<{ day: string; expense: number }>
  currency: string
  height?: number
  today?: string
}) {
  const short = (iso: string) => iso.slice(-2)
  const max = useMemo(() => Math.max(...data.map((d) => d.expense), 1), [data])
  return (
    <div style={{ height }} role="img" aria-label="Daily spending for the month">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="day" tickFormatter={short} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={54} tickFormatter={(v: number) => money(v, currency, { compact: true, noDecimals: true })} domain={[0, Math.ceil(max * 1.05)]} />
          <RTooltip
            labelFormatter={(l: string) => `Day ${Number(l)}`}
            formatter={(value: number) => [money(value, currency), 'Spent']}
            contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 13 }}
          />
          <Bar dataKey="expense" radius={[4, 4, 0, 0]} name="expense">
            {data.map((d, i) => (
              <Cell key={i} fill={today && d.day === today ? '#f59e0b' : d.expense > 0 ? '#10b981' : 'hsl(var(--muted))'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Accessible SVG progress ring for goals */
export function GoalRing({ pct, color, size = 92, label }: { pct: number; color: string; size?: number; label: string }) {
  const clamped = Math.min(Math.max(pct, 0), 100)
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - clamped / 100)
  return (
    <div className="relative shrink-0" role="img" aria-label={`${label}: ${Math.round(clamped)}% funded`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms ease' }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold tabular-nums">{Math.round(clamped)}%</span>
    </div>
  )
}

export { Cell }
