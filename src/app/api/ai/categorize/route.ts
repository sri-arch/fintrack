import { NextRequest } from 'next/server'
import { withUser, db } from '@/lib/api-helpers'
import { aiCategorize } from '@/lib/ai'

/** POST { description, merchant?, type } → suggested category (AI with heuristic fallback). */
export async function POST(req: NextRequest) {
  return withUser(async (user) => {
    const body = await req.json()
    const description = String(body.description ?? '').trim()
    const merchant = body.merchant ? String(body.merchant).trim() : null
    const type = body.type === 'INCOME' ? 'INCOME' : 'EXPENSE'
    if (!description) throw new Error('Type a description first and I will suggest a category.')

    const categories = await db.category.findMany({ where: { userId: user.id, type } })
    if (categories.length === 0) return { suggestion: null }

    const result = await aiCategorize({
      description,
      merchant,
      type,
      candidateNames: categories.map((c) => c.name),
    })

    const category = result.category
      ? categories.find((c) => c.name.toLowerCase() === result.category!.toLowerCase()) ?? null
      : null

    return { suggestion: { categoryId: category?.id ?? null, categoryName: category?.name ?? null, confidence: result.confidence, source: result.source } }
  })
}
