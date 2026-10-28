# Contributing to JobPilot

Thanks for taking a look at JobPilot! This doc covers how to get the app running locally, how the database/migrations work, how to check your changes, and how PRs flow through the repo.

## Project layout

- `app/` — Next.js 14 App Router pages and API routes (`app/api/**`)
- `prisma/` — Prisma schema and migrations (PostgreSQL)
- `lib/` — shared server/client utilities
- `components/` — shared React components (shadcn/ui based)
- `chrome-extension/` / `extension/` + `manifest.json` — the companion Chrome extension that captures job postings from job boards and sends them to the web app
- `scripts/seed-demo.ts` — seeds the read-only demo account (`demo@jobpilot.app`)

## 1. Dev setup

**Requirements:** Node 18+, npm, and a PostgreSQL database (local Postgres, Docker, or a hosted instance like Neon/Supabase).

```bash
git clone https://github.com/iamvisheshsrivastava/jobpilot.git
cd jobpilot
git checkout testing   # see "Branch workflow" below
npm install
```

Copy the example env file and fill in real values:

```bash
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Main connection string the app/Prisma Client uses at runtime. If you're using a pooled connection (PgBouncer, Prisma Accelerate, Neon pooled endpoint, etc.) this should point at the **pooled** endpoint. |
| `DIRECT_URL` | A **direct, non-pooled** connection string to the same database. Prisma Migrate (`prisma migrate dev`/`deploy`) needs this even when `DATABASE_URL` goes through a pooler — set it even for local Postgres, where it can just be the same value as `DATABASE_URL`. |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | Session signing secret for NextAuth v5. Generate with `openssl rand -base64 32`. `AUTH_SECRET` is the v5 alias — setting `NEXTAUTH_SECRET` is enough. |
| `NEXTAUTH_URL` | Base URL of the app, e.g. `http://localhost:3000` for local dev. |
| `ENCRYPTION_KEY` | 64-character hex string used to encrypt things like stored OAuth tokens at rest. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |

Check `.env.example` for the full, current list — if you add a new required env var as part of a change, add it there too.

Run migrations and generate the Prisma client (see below), then start the dev server:

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

### Optional: seed demo data

```bash
npx tsx scripts/seed-demo.ts
```

This seeds the read-only `demo@jobpilot.app` account with sample jobs, categories, and resume versions — useful for manually testing list/analytics/insights views without building up your own data first.

## 2. Database & migrations

The project uses Prisma with PostgreSQL (`prisma/schema.prisma`).

- **Create/apply a new migration during development:**
  ```bash
  npm run db:migrate
  ```
  This runs `prisma migrate dev`, which diffs your schema changes, generates a new migration file under `prisma/migrations/`, applies it to your dev database, and regenerates the Prisma client. Commit the generated migration folder along with your schema change.

- **Apply existing migrations without creating a new one** (e.g. after pulling someone else's migration):
  ```bash
  npx prisma migrate deploy
  ```
  (This is also what `npm run build` runs automatically before `next build`.)

- **Push schema changes without a migration file** (quick local prototyping only — avoid for anything you intend to commit):
  ```bash
  npm run db:push
  ```

- **Regenerate the Prisma client** (usually automatic via `postinstall`, but useful after manually editing the schema):
  ```bash
  npm run db:generate
  ```

- **Browse your local data:**
  ```bash
  npm run db:studio
  ```

If `prisma migrate dev` complains about `directUrl`, double check `DIRECT_URL` is set in `.env` — this is the most common local setup issue.

## 3. Running checks / tests

There is currently no automated test suite in this repo (no `npm test` script). Before opening a PR:

- Run the linter and fix any issues it reports:
  ```bash
  npm run lint
  ```
- Run a production build to catch type errors and build-time issues:
  ```bash
  npm run build
  ```
- Manually exercise the feature/fix you changed in the running dev server. The seeded demo account (see above) is a quick way to get realistic data without writing your own fixtures, and it's also a good sanity check since demo accounts are read-only in several routes (`isDemoAccount()` guards) — make sure your change still respects that where relevant.

If you add non-trivial business logic (parsing, scoring, matching, etc. — see `lib/`), consider adding a small script or test alongside it even though there's no formal framework wired up yet; call this out in your PR description so reviewers know how it was verified.

## 4. Chrome extension

The extension (`manifest.json`, `extension/`, `chrome-extension/`) is loaded as an unpacked extension for local testing:

1. Go to `chrome://extensions`, enable Developer mode.
2. "Load unpacked" and select the repo root (where `manifest.json` lives).
3. Point the extension at your local app by making sure it's calling `http://localhost:3000` (check `background.js`/`content.js` for the configured host) and that you're logged in / have an extension token set up via **Settings → Integrations** in the web app.

## 5. Branch workflow

- `testing` — **this is where active development happens.** Branch your feature/fix branches off `testing` and open PRs back into `testing`.
- `UAT` — redeployed automatically on every push; used for pre-release verification.
- `production` — the live app (`jobpilot-lime.vercel.app`). Do not target this branch directly; releases are promoted from `UAT`/`testing`.
- `main` — kept around for history only; deployments are disabled for it in `vercel.json`. Don't branch from or target `main`.

So: **fork or branch from `testing`, commit there, and open your PR against `testing`**, not `main` or `production`.

## 6. Pull request process

1. Create a branch off `testing`: `git checkout -b fix/short-description testing`.
2. Keep PRs focused — one issue or feature per PR.
3. Make sure `npm run lint` and `npm run build` pass locally.
4. If your change touches the schema, include the generated Prisma migration.
5. If your change touches env vars, update `.env.example`.
6. Write a clear PR description: what changed, why, and how you tested it (manual steps are fine given there's no test suite yet).
7. Link the issue your PR addresses (e.g. "Closes #30") if there is one.
8. Open the PR against `testing` and wait for review — please be responsive to review comments so the PR doesn't go stale.

## Reporting bugs / proposing features

Use GitHub Issues. Check existing open/closed issues first to avoid duplicates. For bugs, include repro steps, expected vs. actual behavior, and relevant logs/screenshots where possible. Issues labeled `good first issue` are small, scoped tasks that are a good place to start.
