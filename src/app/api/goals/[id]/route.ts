import { NextRequest } from 'next/server'
import { withUser, db } from '@/lib/api-helpers'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withUser(async (user) => {
    const { id } = await params
    const body = await req.json()
    const goal = await db.goal.findFirst({ where: { id, userId: user.id } })
    if (!goal) throw new Error('Goal not found.')

    let currentAmount = goal.currentAmount
    // contribute: { contribute: number } adds to current
    if (body.contribute !== undefined) {
      const add = Number(body.contribute)
      if (!isFinite(add)) throw new Error('Invalid contribution amount.')
      currentAmount = Math.max(currentAmount + add, 0)
    } else if (body.currentAmount !== undefined) {
      currentAmount = Math.max(Number(body.currentAmount) || 0, 0)
    }

    const targetAmount = body.targetAmount !== undefined ? Number(body.targetAmount) : goal.targetAmount
    const completed = targetAmount > 0 && currentAmount >= targetAmount

    const updated = await db.goal.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() || goal.name : goal.name,
        icon: body.icon !== undefined ? String(body.icon) : goal.icon,
        color: body.color !== undefined ? String(body.color) : goal.color,
        targetAmount: isFinite(targetAmount) && targetAmount > 0 ? targetAmount : goal.targetAmount,
        currentAmount,
        currency: body.currency !== undefined ? String(body.currency) : goal.currency,
        targetDate: body.targetDate !== undefined ? (body.targetDate ? new Date(body.targetDate) : null) : goal.targetDate,
        note: body.note !== undefined ? (body.note ? String(body.note) : null) : goal.note,
        status: completed ? 'COMPLETED' : goal.status === 'COMPLETED' && currentAmount < goal.targetAmount ? 'ACTIVE' : goal.status,
      },
    })
    return { goal: updated }
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withUser(async (user) => {
    const { id } = await params
    const goal = await db.goal.findFirst({ where: { id, userId: user.id } })
    if (!goal) throw new Error('Goal not found.')
    await db.goal.delete({ where: { id } })
    return { ok: true }
  })
}
