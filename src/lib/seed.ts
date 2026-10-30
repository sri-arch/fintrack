// Realistic 90-day sample data generator for new accounts / demo user
import { db } from '@/lib/db'
import { DEFAULT_CATEGORIES } from '@/lib/default-categories'
import { randomBytes } from 'crypto'

interface SeededTxn {
  type: 'EXPENSE' | 'INCOME'
  categoryName: string
  amount: number
  currency: string
  description: string
  merchant?: string
  dayOffset: number // days ago
  aiCategorized?: boolean
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Build ~90 days of plausible transactions ending today. */
export function generateSampleTransactions(): SeededTxn[] {
  const txns: SeededTxn[] = []
  const today = new Date()
  const daysBack = 92

  // Salary on the 1st of each covered month (base USD)
  for (let d = daysBack; d >= 0; d--) {
    const date = new Date(today)
    date.setDate(date.getDate() - d)
    if (date.getDate() === 1) {
      txns.push({
        type: 'INCOME',
        categoryName: 'Salary',
        amount: 5200,
        currency: 'USD',
        description: 'Monthly salary — Nova Systems Inc.',
        merchant: 'Nova Systems',
        dayOffset: d,
      })
    }
  }

  // Freelance income occasionally
  const freelanceDays = [78, 61, 44, 23, 9]
  for (const d of freelanceDays) {
    txns.push({
      type: 'INCOME',
      categoryName: 'Freelance',
      amount: round2(400 + Math.random() * 900),
      currency: 'USD',
      description: pick(['Landing page build — client A', 'API integration gig', 'Design system consultation', 'Blog writing package']),
      merchant: 'Upwork',
      dayOffset: d,
    })
  }

  // Rent on the 1st (base currency)
  for (let d = daysBack; d >= 0; d--) {
    const date = new Date(today)
    date.setDate(date.getDate() - d)
    if (date.getDate() === 1) {
      txns.push({
        type: 'EXPENSE',
        categoryName: 'Rent & Home',
        amount: 1450,
        currency: 'USD',
        description: 'Apartment rent',
        merchant: 'Skyline Properties',
        dayOffset: d,
      })
    }
  }

  // Fixed subscriptions around their billing dates each month
  const subs = [
    { day: 3, name: 'Netflix', amount: 15.49 },
    { day: 6, name: 'Spotify', amount: 11.99 },
    { day: 12, name: 'iCloud+ Storage', amount: 2.99 },
    { day: 18, name: 'Gym membership', amount: 35 },
  ]
  for (let d = daysBack; d >= 0; d--) {
    const date = new Date(today)
    date.setDate(date.getDate() - d)
    for (const s of subs) {
      if (date.getDate() === s.day) {
        txns.push({
          type: 'EXPENSE',
          categoryName: s.name === 'Gym membership' ? 'Health & Fitness' : 'Subscriptions',
          amount: s.amount,
          currency: 'USD',
          description: `${s.name} — monthly`,
          merchant: s.name,
          dayOffset: d,
          aiCategorized: true,
        })
      }
    }
  }

  // Groceries: 1-2x per week
  const groceryMerchants = ['Whole Foods', 'Trader Joe\'s', 'Fresh Market', 'Costco', 'Kroger']
  for (let d = daysBack; d >= 0; d--) {
    if (Math.random() < 0.28) {
      txns.push({
        type: 'EXPENSE',
        categoryName: 'Groceries',
        amount: round2(28 + Math.random() * 85),
        currency: 'USD',
        description: pick(['Weekly grocery run', 'Fresh produce & staples', 'Pantry restock', 'Groceries for the week']),
        merchant: pick(groceryMerchants),
        dayOffset: d,
      })
    }
  }

  // Food & Dining: frequent, small
  const dining = [
    { m: 'Starbucks', d: 'Morning coffee', lo: 4, hi: 9 },
    { m: 'Sweetgreen', d: 'Lunch bowl', lo: 11, hi: 18 },
    { m: 'Pasta Corner', d: 'Dinner out', lo: 22, hi: 55 },
    { m: 'DoorDash', d: 'Food delivery', lo: 15, hi: 38 },
    { m: 'Sushi Bar', d: 'Sushi dinner', lo: 30, hi: 70 },
  ]
  for (let d = daysBack; d >= 0; d--) {
    const n = Math.random() < 0.55 ? (Math.random() < 0.25 ? 2 : 1) : 0
    for (let i = 0; i < n; i++) {
      const item = pick(dining)
      txns.push({
        type: 'EXPENSE',
        categoryName: 'Food & Dining',
        amount: round2(item.lo + Math.random() * (item.hi - item.lo)),
        currency: 'USD',
        description: item.d,
        merchant: item.m,
        dayOffset: d,
      })
    }
  }

  // Transport: frequent small
  const transport = [
    { m: 'Uber', d: 'Ride to meeting', lo: 8, hi: 24 },
    { m: 'Metro Card', d: 'Transit top-up', lo: 10, hi: 30 },
    { m: 'Shell', d: 'Fuel', lo: 30, hi: 60 },
  ]
  for (let d = daysBack; d >= 0; d--) {
    if (Math.random() < 0.32) {
      const item = pick(transport)
      txns.push({
        type: 'EXPENSE',
        categoryName: 'Transport',
        amount: round2(item.lo + Math.random() * (item.hi - item.lo)),
        currency: 'USD',
        description: item.d,
        merchant: item.m,
        dayOffset: d,
      })
    }
  }

  // Shopping: occasional, occasionally splurgy (creates anomalies)
  const shopping = [
    { m: 'Amazon', d: 'Household order', lo: 18, hi: 90 },
    { m: 'Zara', d: 'Clothes', lo: 40, hi: 160 },
    { m: 'IKEA', d: 'Home items', lo: 35, hi: 220 },
  ]
  for (let d = daysBack; d >= 0; d--) {
    if (Math.random() < 0.13) {
      const item = pick(shopping)
      txns.push({
        type: 'EXPENSE',
        categoryName: 'Shopping',
        amount: round2(item.lo + Math.random() * (item.hi - item.lo)),
        currency: 'USD',
        description: item.d,
        merchant: item.m,
        dayOffset: d,
      })
    }
  }
  // Two deliberate splurges for anomaly detection
  txns.push({ type: 'EXPENSE', categoryName: 'Shopping', amount: 429, currency: 'USD', description: 'Weekend sale splurge', merchant: 'Nike', dayOffset: 7 })
  txns.push({ type: 'EXPENSE', categoryName: 'Entertainment', amount: 185, currency: 'USD', description: 'Concert tickets', merchant: 'Ticketmaster', dayOffset: 16 })

  // Entertainment: weekends
  for (let d = daysBack; d >= 0; d--) {
    const date = new Date(today)
    date.setDate(date.getDate() - d)
    if ((date.getDay() === 5 || date.getDay() === 6) && Math.random() < 0.4) {
      txns.push({
        type: 'EXPENSE',
        categoryName: 'Entertainment',
        amount: round2(12 + Math.random() * 55),
        currency: 'USD',
        description: pick(['Movie night', 'Streaming event rental', 'Board game café', 'Weekend outing']),
        merchant: pick(['AMC Theatres', 'Local Cinema', 'Steam', 'Eventbrite']),
        dayOffset: d,
      })
    }
  }

  // Bills: mid-month
  for (let d = daysBack; d >= 0; d--) {
    const date = new Date(today)
    date.setDate(date.getDate() - d)
    if (date.getDate() === 8) {
      txns.push({ type: 'EXPENSE', categoryName: 'Bills & Utilities', amount: 78.4, currency: 'USD', description: 'Electricity bill', merchant: 'City Power', dayOffset: d })
      txns.push({ type: 'EXPENSE', categoryName: 'Bills & Utilities', amount: 55, currency: 'USD', description: 'Internet — fiber 500Mbps', merchant: 'FiberLink', dayOffset: d })
    }
    if (date.getDate() === 20) {
      txns.push({ type: 'EXPENSE', categoryName: 'Bills & Utilities', amount: 32.75, currency: 'USD', description: 'Water & sewage', merchant: 'City Water', dayOffset: d })
    }
  }

  // Travel: one trip in EUR (shows multi-currency)
  txns.push({ type: 'EXPENSE', categoryName: 'Travel', amount: 340, currency: 'EUR', description: 'Weekend in Berlin — hotel', merchant: 'HotelAdlon', dayOffset: 34 })
  txns.push({ type: 'EXPENSE', categoryName: 'Travel', amount: 210, currency: 'EUR', description: 'Flight to Berlin', merchant: 'AirEuropa', dayOffset: 36 })
  txns.push({ type: 'EXPENSE', categoryName: 'Food & Dining', amount: 5400, currency: 'JPY', description: 'Dinner in Tokyo — omakase', merchant: 'SushiSaito', dayOffset: 60 })

  // Personal care
  for (let d = daysBack; d >= 0; d--) {
    if (Math.random() < 0.06) {
      txns.push({ type: 'EXPENSE', categoryName: 'Personal Care', amount: round2(15 + Math.random() * 60), currency: 'USD', description: pick(['Haircut', 'Skincare restock', 'Pharmacy run']), merchant: pick(['Barber Co.', 'Sephora', 'CVS']), dayOffset: d })
    }
  }

  return txns
}

/** Seed default categories, sample transactions, budgets and goals for a user. */
export async function seedUserData(userId: string, baseCurrency: string) {
  // 1) Categories
  const catMap = new Map<string, string>()
  for (const c of DEFAULT_CATEGORIES) {
    const created = await db.category.create({
      data: { userId, name: c.name, icon: c.icon, color: c.color, type: c.type, isSystem: true, isDefault: c.isDefault ?? false },
    })
    catMap.set(c.name, created.id)
  }

  // 2) Transactions
  const txns = generateSampleTransactions()
  const start = new Date()
  start.setDate(start.getDate() - 92)
  await db.transaction.createMany({
    data: txns.map((t) => ({
      userId,
      categoryId: catMap.get(t.categoryName) ?? null,
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      description: t.description,
      merchant: t.merchant ?? null,
      date: (() => {
        const d = new Date()
        d.setDate(d.getDate() - t.dayOffset)
        d.setHours(9 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0)
        return d
      })(),
      aiCategorized: t.aiCategorized ?? false,
    })),
  })

  // 3) Budgets derived from actual spending (≈115% of the average monthly spend per category,
  //    rounded to friendly numbers) so safe-to-spend and budget states look realistic.
  const spendByCat = new Map<string, { total: number; months: Set<string> }>()
  for (const t of txns) {
    if (t.type !== 'EXPENSE') continue
    const d = new Date()
    d.setDate(d.getDate() - t.dayOffset)
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const entry = spendByCat.get(t.categoryName) ?? { total: 0, months: new Set<string>() }
    entry.total += t.amount * (t.currency === 'USD' ? 1 : t.currency === 'EUR' ? 0.92 : t.currency === 'JPY' ? 1 / 149.5 : 1)
    entry.months.add(mk)
    spendByCat.set(t.categoryName, entry)
  }
  const months = [0, 1].map((i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const budgetCats = ['Food & Dining', 'Groceries', 'Transport', 'Bills & Utilities', 'Shopping', 'Entertainment', 'Subscriptions', 'Personal Care']
  for (const month of months) {
    for (const catName of budgetCats) {
      const catId = catMap.get(catName)
      if (!catId) continue
      const s = spendByCat.get(catName)
      let amount: number
      if (s && s.months.size > 0) {
        const avg = s.total / Math.max(s.months.size, 1)
        // leave a little headroom so most budgets end "ok", a couple drift to warn/over
        amount = Math.max(Math.round((avg * 1.15) / 10) * 10, 20)
      } else {
        amount = 80
      }
      await db.budget.upsert({
        where: { userId_categoryId_month: { userId, categoryId: catId, month } },
        update: {},
        create: { userId, categoryId: catId, amount, month },
      })
    }
  }

  // 4) Goals (in base currency)
  const goalTarget1 = new Date()
  goalTarget1.setMonth(goalTarget1.getMonth() + 8)
  const goalTarget2 = new Date()
  goalTarget2.setMonth(goalTarget2.getMonth() + 5)
  const goalTarget3 = new Date()
  goalTarget3.setMonth(goalTarget3.getMonth() + 12)
  await db.goal.createMany({
    data: [
      { userId, name: 'Emergency Fund', icon: 'ShieldCheck', color: '#10b981', targetAmount: 10000, currentAmount: 3400, currency: baseCurrency, targetDate: goalTarget1, note: '6 months of essential expenses' },
      { userId, name: 'Japan Trip', icon: 'Plane', color: '#06b6d4', targetAmount: 4500, currentAmount: 1250, currency: baseCurrency, targetDate: goalTarget2, note: 'Flights + 10 days in Tokyo & Kyoto' },
      { userId, name: 'New Laptop', icon: 'Laptop', color: '#8b5cf6', targetAmount: 2000, currentAmount: 760, currency: baseCurrency, targetDate: goalTarget3, note: 'For design & dev work' },
    ],
  })
}

/** Ensure the shared demo account exists with fresh data. Race-safe on serverless. */
export async function ensureDemoAccount() {
  const email = 'demo@fintrack.app'
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return existing
  const { hashPassword } = await import('@/lib/auth')
  try {
    const user = await db.user.create({
      data: {
        email,
        passwordHash: hashPassword('demo1234'),
        name: 'Demo User',
        baseCurrency: 'USD',
      },
    })
    await seedUserData(user.id, 'USD')
    return user
  } catch (err) {
    // Lost a creation race (unique email) — another instance seeded it already
    const user = await db.user.findUnique({ where: { email } })
    if (user) return user
    throw err
  }
}

export function makeInvitationCode(): string {
  return randomBytes(4).toString('hex')
}
