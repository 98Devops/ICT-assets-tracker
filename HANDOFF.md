# HANDOFF — cold-start guide

## Run locally
1. `npm install`
2. Copy `.env.example` → `.env`; fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project (Settings → API).
3. `npm run dev` → http://localhost:5173

## Database
- Schema lives in `supabase/migrations/*.sql`, ordered. Apply in order via Supabase SQL editor or `supabase db push` (project must be linked: `supabase link --project-ref <ref>`).
- Never mutate the DB by hand without a migration file.

## Deployment
- Target: owner's Vercel or Netlify account (git-push deploy). **Not yet deployed.**
- SPA fallback required (all routes → index.html): Netlify `_redirects` (`/* /index.html 200`) or `vercel.json` rewrites — add at deploy time.

## Test credentials
- Demo users (5 roles) to be created by the seed script — **not yet seeded**. Will be listed here with passwords once created.

## Supabase project
- **Not yet linked** — owner (Tafara, tfrsuperfx@gmail.com) has an account; credentials pending.

## Gotchas
- `src/lib/supabase.ts` throws at startup if env vars are missing (deliberate, fail-fast).
- Views require Postgres 15+ for `security_invoker` (Supabase default is fine).
- Storage bucket `asset-attachments` is private; files served via signed URLs.
