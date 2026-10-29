// One-off utility: delete the demo account so it re-seeds with fresh logic
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const demo = await db.user.findUnique({ where: { email: 'demo@fintrack.app' } })
  if (demo) {
    await db.user.delete({ where: { id: demo.id } })
    console.log('demo user deleted — it will re-seed on next demo login')
  } else {
    console.log('no demo user found')
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
