import { NextRequest } from 'next/server'
import { withUser } from '@/lib/api-helpers'
import { getAnalytics, getUserRates } from '@/lib/analytics'

export async function GET(req: NextRequest) {
  return withUser(async (user) => {
    const month = req.nextUrl.searchParams.get('month') ?? undefined
    const ur = await getUserRates(user)
    const analytics = await getAnalytics(user.id, ur, month)
    return { analytics }
  })
}
