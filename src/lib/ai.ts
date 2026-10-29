// Server-side AI helpers via z-ai-web-dev-sdk (backend only) with heuristic fallback.

export interface CategorizeInput {
  description: string
  merchant?: string | null
  type: 'EXPENSE' | 'INCOME'
  candidateNames: string[]
}

export interface CategorizeResult {
  category: string | null
  confidence: 'high' | 'medium' | 'low'
  source: 'ai' | 'heuristic'
}

/** Keyword heuristic fallback — fast, deterministic, no network. */
const HEURISTICS: Array<[RegExp, string]> = [
  [/uber|ola|lyft|taxi|cab|metro|subway|train|bus|fuel|petrol|gas station|parking|toll/i, 'Transport'],
  [/grocer|supermarket|whole foods|trader joe|costco|walmart|kroger|aldi|market/i, 'Groceries'],
  [/restaurant|cafe|coffee|starbucks|pizza|burger|dinner|lunch|breakfast|food|doordash|swiggy|zomato|uber eats|takeout/i, 'Food & Dining'],
  [/rent|mortgage|landlord|electric|water bill|internet|wifi|utility|gas bill|broadband/i, 'Bills & Utilities'],
  [/netflix|spotify|hulu|disney|prime video|youtube premium|subscription|icloud|google one|adobe/i, 'Subscriptions'],
  [/movie|cinema|concert|game|gaming|steam|playstation|xbox|netflix party|theme park|club|bar/i, 'Entertainment'],
  [/amazon|mall|clothes|clothing|zara|h&m|nike|adidas|shoes|shopping|flipkart|myntra|etsy|ikea/i, 'Shopping'],
  [/pharmacy|doctor|hospital|clinic|dentist|medicine|health|gym|fitness|therapy|insurance/i, 'Health & Fitness'],
  [/book|course|tuition|school|college|university|udemy|coursera|class|training|exam/i, 'Education'],
  [/flight|hotel|airbnb|travel|trip|visa|train ticket|resort|booking/i, 'Travel'],
  [/salary|payroll|paycheck|wage|stipend/i, 'Salary'],
  [/freelance|consult|client payment|upwork|fiverr|gig/i, 'Freelance'],
  [/dividend|interest|stocks|mutual fund|investment|crypto|portfolio/i, 'Investments'],
  [/salon|haircut|spa|skincare|cosmetics|barber|personal care|toiletries/i, 'Personal Care'],
  [/charity|donation|gift|temple|church|mosque|offering/i, 'Gifts & Donations'],
]

export function heuristicCategorize(input: CategorizeInput): CategorizeResult {
  const text = `${input.merchant ?? ''} ${input.description}`.trim()
  if (input.type === 'INCOME') {
    for (const [re, name] of HEURISTICS) {
      if (['Salary', 'Freelance', 'Investments'].includes(name) && re.test(text)) {
        const match = input.candidateNames.find((c) => c.toLowerCase() === name.toLowerCase())
        if (match) return { category: match, confidence: 'medium', source: 'heuristic' }
      }
    }
    return { category: null, confidence: 'low', source: 'heuristic' }
  }
  for (const [re, name] of HEURISTICS) {
    if (re.test(text)) {
      const match = input.candidateNames.find((c) => c.toLowerCase() === name.toLowerCase())
      if (match) return { category: match, confidence: 'medium', source: 'heuristic' }
    }
  }
  return { category: null, confidence: 'low', source: 'heuristic' }
}

/** AI auto-categorization with graceful heuristic fallback. Never throws. */
export async function aiCategorize(input: CategorizeInput): Promise<CategorizeResult> {
  const fallback = heuristicCategorize(input)
  try {
    const { default: ZAI } = await import('z-ai-web-dev-sdk')
    const zai = await ZAI.create()
    const prompt = `Classify this financial transaction into exactly one category from the list.

Transaction:
- Description: ${input.description}
- Merchant: ${input.merchant || 'unknown'}
- Type: ${input.type}

Categories: ${input.candidateNames.join(', ')}

Answer with ONLY the category name from the list, nothing else. If none fit, answer "Other".`
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      thinking: { type: 'disabled' },
    })
    const raw = completion.choices[0]?.message?.content?.trim() ?? ''
    const cleaned = raw.replace(/["'`\n]/g, '').trim()
    const exact = input.candidateNames.find((c) => c.toLowerCase() === cleaned.toLowerCase())
    if (exact) return { category: exact, confidence: 'high', source: 'ai' }
    const partial = input.candidateNames.find(
      (c) => cleaned.length > 2 && (c.toLowerCase().includes(cleaned.toLowerCase()) || cleaned.toLowerCase().includes(c.toLowerCase()))
    )
    if (partial) return { category: partial, confidence: 'medium', source: 'ai' }
    return fallback
  } catch {
    return fallback
  }
}

export interface ReviewInput {
  userName: string
  monthLabel: string
  baseCurrency: string
  stats: Record<string, unknown>
}

/** Generate the AI monthly review narrative. Returns plain text (markdown-lite). */
export async function aiMonthlyReview(input: ReviewInput): Promise<string> {
  const { default: ZAI } = await import('z-ai-web-dev-sdk')
  const zai = await ZAI.create()
  const prompt = `You are a warm, sharp personal-finance analyst. Write a monthly money review for ${input.userName} for ${input.monthLabel}.

Data (all amounts in ${input.baseCurrency}):
${JSON.stringify(input.stats, null, 2)}

Write 180-260 words in this structure (use these exact section markers):
**The headline** — one sentence capturing the month.
**Where it went** — top spending categories with numbers and % of total.
**What stands out** — one anomaly or notable change, with a number.
**One move for next month** — a single specific, realistic action with an estimated amount saved.

Rules: plain language a teenager could follow, no jargon, no emojis, never invent numbers not present in the data, be encouraging but honest.`
  const completion = await zai.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    thinking: { type: 'disabled' },
  })
  const text = completion.choices[0]?.message?.content?.trim()
  if (!text) throw new Error('Empty AI response')
  return text
}
