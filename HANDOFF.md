# HANDOFF — cold-start guide

## Run locally
1. `npm install`
2. Copy `.env.example` → `.env`; fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project (Settings → API).
3. `npm run dev` → http://localhost:5173

## Database
- Schema lives in `supabase/migrations/*.sql`, ordered. Apply in order via Supabase SQL editor or `supabase db push` (project must be linked: `supabase link --project-ref <ref>`).
- Never mutate the DB by hand without a migration file.

## Deployment
- **LIVE: https://iats-tracker.netlify.app** (Netlify project `iats-tracker`, ID 8d15f442-3829-49b0-b3f5-f225ed808546, owner's account)
- Deploy: `npm run build && npx netlify deploy --prod --dir dist` (netlify-cli is a devDependency; env vars also set on Netlify)
- SPA fallback + security headers in `netlify.toml`.

## Test credentials (demo org: Kumbudzi High School)
Password for all: `IATS-demo-2026!`
| Role | Email |
|------|-------|
| super_admin | admin@iats.demo |
| ict_manager | manager@iats.demo |
| technician | tech@iats.demo |
| auditor | auditor@iats.demo |
| staff | staff@iats.demo |

## Supabase project
- `https://fzrxhhktpscrxjrotzon.supabase.co` (region eu-central-1; owner's account, tfrsuperfx@gmail.com)
- Migrations applied via `node scripts/migrate.mjs` (tracks `_migrations` table; DB password in `.env` as `DB_PASSWORD`)
- Seed: `node scripts/seed.mjs` · RLS proof: `node tests/rls-check.mjs` (14 checks)

## Gotchas
- `src/lib/supabase.ts` throws at startup if env vars are missing (deliberate, fail-fast).
- Views require Postgres 15+ for `security_invoker` (Supabase default is fine).
- Storage bucket `asset-attachments` is private; files served via signed URLs.
