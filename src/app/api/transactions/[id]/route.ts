import { NextRequest } from 'next/server'
import { withUser, db } from '@/lib/api-helpers'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withUser(async (user) => {
    const { id } = await params
    const body = await req.json()
    const txn = await db.transaction.findFirst({ where: { id, userId: user.id } })
    if (!txn) throw new Error('Transaction not found.')

    const amount = body.amount !== undefined ? Number(body.amount) : txn.amount
    if (!isFinite(amount) || amount <= 0) throw new Error('Please enter an amount greater than zero.')

    const updated = await db.transaction.update({
      where: { id },
      data: {
        type: body.type === 'INCOME' || body.type === 'EXPENSE' ? body.type : txn.type,
        amount,
        currency: body.currency !== undefined ? String(body.currency) : txn.currency,
        description: body.description !== undefined ? String(body.description).trim() || txn.description : txn.description,
        merchant: body.merchant !== undefined ? (body.merchant ? String(body.merchant).trim() : null) : txn.merchant,
        notes: body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : txn.notes,
        categoryId: body.categoryId !== undefined ? body.categoryId || null : txn.categoryId,
        date: body.date ? new Date(body.date) : txn.date,
        aiCategorized: body.aiCategorized !== undefined ? Boolean(body.aiCategorized) : txn.aiCategorized,
      },
      include: { category: true },
    })
    return { transaction: updated }
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withUser(async (user) => {
    const { id } = await params
    const txn = await db.transaction.findFirst({ where: { id, userId: user.id } })
    if (!txn) throw new Error('Transaction not found.')
    await db.transaction.delete({ where: { id } })
    return { ok: true }
  })
}
