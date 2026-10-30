# FinTrack AI

Intelligent personal expense tracking with AI-powered auto-categorization, anomaly detection, and monthly review. Built with adaptive layout, multi-currency support, and accessibility-first design.

## Features

- **Dashboard** — Safe-to-Spend guardrail, savings-rate card, month-end expense forecast, 90-day cash flow, goals snapshot
- **AI Auto-Categorization** — server-side LLM classifies transactions with merchant/category hints, with confidence and fallback rules
- **Anomaly Detection & Insights** — unusual spending alerts, subscription detection, month-over-month review via AI
- **Budgets & Goals** — monthly category budgets with progress rings, savings goals with target dates and monthly contribution math
- **Multi-Currency** — per-transaction currency with consolidated reporting in base currency
- **Adaptive Layout** — responsive design for mobile and desktop

## Tech Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS 4
- **shadcn/ui** components + Recharts + TanStack Query + Framer Motion
- **Prisma** ORM + SQLite
- **z-ai-web-dev-sdk** for server-side AI features
- **scrypt** password hashing + database-backed sessions

## Getting Started

```bash
# install dependencies
npm install

# set up the database
npx prisma db push
npm run db:seed   # seeds a demo account with 90 days of data

# start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo Account

| Email | Password |
| --- | --- |
| `demo@fintrack.app` | `demo1234` |

> The app auto-creates and signs into the demo account when no session exists, so you can explore without registering.

## Environment

Create a `.env` file in the project root:

```env
DATABASE_URL=file:./prisma/dev.db
```

## Deploying to Vercel

The app uses SQLite, which needs two small adaptations on serverless platforms — both are handled automatically by the build:

1. **Build time** — `prisma db push` creates a schema-only `prisma/dev.db`, which is bundled into the serverless functions via `outputFileTracingIncludes`.
2. **Runtime** — the bundled database is copied once into the writable `/tmp` directory per instance, and the demo account with 90 days of sample data is seeded lazily on first request. Data persists while an instance is warm and resets on new instances — perfect for demos; for production persistence, switch the Prisma datasource to Turso or Postgres.

No environment variables are required on Vercel (`DATABASE_URL` is optional).

```bash
npm i -g vercel
vercel --prod
```


## Project Structure

```
src/
  app/            # App Router pages & API routes
  components/     # UI + app components (dashboard, budgets, goals, insights...)
  lib/            # auth, currency, AI, analytics, seed helpers
prisma/           # schema & migrations
db/               # SQLite database (git-ignored)
```
