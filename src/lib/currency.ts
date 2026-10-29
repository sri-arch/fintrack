// Multi-currency engine: currencies, static base rates, conversion + formatting

export interface CurrencyDef {
  code: string
  symbol: string
  name: string
  locale: string
  rateFromUSD: number // how many units of this currency per 1 USD
}

export const CURRENCIES: CurrencyDef[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', rateFromUSD: 1 },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', rateFromUSD: 0.92 },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', rateFromUSD: 0.79 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', rateFromUSD: 83.2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', rateFromUSD: 149.5 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN', rateFromUSD: 7.24 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', rateFromUSD: 1.34 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA', rateFromUSD: 1.36 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', rateFromUSD: 1.52 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'en-AE', rateFromUSD: 3.67 },
]

export function getCurrency(code: string): CurrencyDef {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]
}

export type RateMap = Record<string, number>

/** Build a rate table honoring user overrides (rates are units per 1 USD). */
export function buildRates(custom?: RateMap | null): RateMap {
  const rates: RateMap = {}
  for (const c of CURRENCIES) rates[c.code] = c.rateFromUSD
  if (custom) {
    for (const [k, v] of Object.entries(custom)) {
      if (typeof v === 'number' && isFinite(v) && v > 0) rates[k] = v
    }
  }
  return rates
}

/** Convert an amount from one currency to another. */
export function convert(amount: number, from: string, to: string, rates: RateMap): number {
  if (from === to) return amount
  const f = rates[from] ?? 1
  const t = rates[to] ?? 1
  return (amount / f) * t
}

/** Format an amount in a given currency using its locale (lakh grouping for INR etc.). */
export function formatMoney(amount: number, code: string, opts?: { compact?: boolean; noDecimals?: boolean }): string {
  const cur = getCurrency(code)
  try {
    return new Intl.NumberFormat(cur.locale, {
      style: 'currency',
      currency: cur.code,
      notation: opts?.compact ? 'compact' : 'standard',
      maximumFractionDigits: opts?.noDecimals ? 0 : opts?.compact ? 1 : 2,
      minimumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${cur.symbol}${amount.toFixed(opts?.noDecimals ? 0 : 2)}`
  }
}

export function formatCompactBase(amount: number, code: string): string {
  return formatMoney(amount, code, { compact: true })
}
