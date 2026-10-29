import { NextRequest } from 'next/server'
import { withUser, db } from '@/lib/api-helpers'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withUser(async (user) => {
    const { id } = await params
    const body = await req.json()
    const cat = await db.category.findFirst({ where: { id, userId: user.id } })
    if (!cat) throw new Error('Category not found.')
    const updated = await db.category.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() || cat.name : cat.name,
        icon: body.icon !== undefined ? String(body.icon) : cat.icon,
        color: body.color !== undefined ? String(body.color) : cat.color,
      },
    })
    return { category: updated }
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withUser(async (user) => {
    const { id } = await params
    const cat = await db.category.findFirst({ where: { id, userId: user.id } })
    if (!cat) throw new Error('Category not found.')
    // Move its transactions to "Other"/default category of same type if exists
    const fallback = await db.category.findFirst({ where: { userId: user.id, type: cat.type, isDefault: true } })
    await db.transaction.updateMany({ where: { categoryId: id }, data: { categoryId: fallback?.id ?? null } })
    await db.budget.deleteMany({ where: { categoryId: id } })
    await db.category.delete({ where: { id } })
    return { ok: true }
  })
}
