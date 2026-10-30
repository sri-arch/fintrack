import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
  __fintrackDbUrl?: string
}

function absoluteFile(p: string): string {
  const bare = p.slice('file:'.length).split('?')[0]
  return path.isAbsolute(bare) ? bare : path.join(process.cwd(), bare)
}

/**
 * Resolve the SQLite database location for the current environment.
 *
 * - Local / sandbox: use DATABASE_URL when it points at an existing file,
 *   otherwise fall back to the dev database next to the schema (prisma/dev.db).
 * - Serverless (Vercel): the deployment filesystem is immutable and shared,
 *   so copy the schema-only database bundled at build time into the writable
 *   /tmp directory once per instance and point Prisma there. The demo account
 *   and 90-day sample data are then seeded lazily by ensureDemoAccount().
 */
function resolveDatabaseUrl(): string {
  if (globalForPrisma.__fintrackDbUrl) return globalForPrisma.__fintrackDbUrl

  // 1) Explicit DATABASE_URL pointing at an existing SQLite file
  const fromEnv = process.env.DATABASE_URL
  if (fromEnv?.startsWith('file:')) {
    const p = absoluteFile(fromEnv)
    if (fs.existsSync(p)) {
      globalForPrisma.__fintrackDbUrl = `file:${p}`
      return globalForPrisma.__fintrackDbUrl
    }
  }

  const bundled = path.join(process.cwd(), 'prisma', 'dev.db')
  const bundledExists = fs.existsSync(bundled) && fs.statSync(bundled).size > 0

  // 2) Non-serverless: use the bundled/dev database in place (writable FS)
  if (!process.env.VERCEL && bundledExists) {
    globalForPrisma.__fintrackDbUrl = `file:${bundled}`
    return globalForPrisma.__fintrackDbUrl
  }

  // 3) Serverless: copy the bundled schema-only DB into /tmp (once per instance)
  const deployTag = (process.env.VERCEL_URL || process.env.VERCEL_DEPLOYMENT_ID || 'serverless')
    .replace(/[^a-zA-Z0-9-]/g, '_')
    .slice(0, 60)
  const target = path.join(os.tmpdir(), `fintrack-${deployTag}.db`)
  if (bundledExists) {
    try {
      if (!fs.existsSync(target) || fs.statSync(target).size === 0) {
        fs.copyFileSync(bundled, target)
      }
      globalForPrisma.__fintrackDbUrl = `file:${target}`
      return globalForPrisma.__fintrackDbUrl
    } catch (err) {
      console.error('[db] failed to stage SQLite database in /tmp', err)
    }
  } else {
    console.error('[db] bundled prisma/dev.db missing from deployment — add it to outputFileTracingIncludes')
  }

  // 4) Last resort: let Prisma create an empty file (schema bootstrap required)
  globalForPrisma.__fintrackDbUrl = `file:${target}`
  return globalForPrisma.__fintrackDbUrl
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
    datasourceUrl: resolveDatabaseUrl(),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
