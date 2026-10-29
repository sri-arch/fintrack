import { NextRequest } from 'next/server'
import { withUser, db } from '@/lib/api-helpers'

export async function GET() {
  return withUser(async (user) => {
    const goals = await db.goal.findMany({
      where: { userId: user.id },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    })
    return { goals }
  })
}

export async function POST(req: NextRequest) {
  return withUser(async (user) => {
    const body = await req.json()
    const name = String(body.name ?? '').trim()
    const targetAmount = Number(body.targetAmount)
    if (!name) throw new Error('Give your goal a name you will recognize.')
    if (!isFinite(targetAmount) || targetAmount <= 0) throw new Error('Target amount must be greater than zero.')
    const targetDate = body.targetDate ? new Date(body.targetDate) : null
    const goal = await db.goal.create({
      data: {
        userId: user.id,
        name,
        icon: String(body.icon ?? 'Target'),
        color: String(body.color ?? '#10b981'),
        targetAmount,
        currentAmount: Number(body.currentAmount ?? 0),
        currency: String(body.currency ?? user.baseCurrency),
        targetDate: targetDate && !isNaN(targetDate.getTime()) ? targetDate : null,
        note: body.note ? String(body.note).trim() : null,
      },
    })
    return { goal }
  })
}
