import { NextRequest } from 'next/server'
import { withUser, db } from '@/lib/api-helpers'

export async function GET() {
  return withUser(async (user) => {
    const categories = await db.category.findMany({
      where: { userId: user.id },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { transactions: true } } },
    })
    return { categories }
  })
}

export async function POST(req: NextRequest) {
  return withUser(async (user) => {
    const body = await req.json()
    const name = String(body.name ?? '').trim()
    const type = body.type === 'INCOME' ? 'INCOME' : 'EXPENSE'
    if (!name) throw new Error('Category name is required.')
    const existing = await db.category.findUnique({ where: { userId_name: { userId: user.id, name } } })
    if (existing) throw new Error('A category with this name already exists.')
    const category = await db.category.create({
      data: {
        userId: user.id,
        name,
        icon: String(body.icon ?? 'Tag'),
        color: String(body.color ?? '#10b981'),
        type,
      },
    })
    return { category }
  })
}
