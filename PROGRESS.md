# PROGRESS — IATS (ICT Assets Tracker System)

> Master state file. Read this first. Status legend: ☐ todo · ◐ in progress · ✅ done-and-verified.

## Current phase
**Slice 0 — Foundation** (complete pending Supabase migration apply) → next: Slice 1 Auth + roles.

## Requirement checklist (from build spec)
- ◐ Secure auth with role-based access (RLS written in `supabase/migrations/0003_rls.sql`; not yet applied — needs owner's Supabase credentials)
- ☐ Full asset register (CRUD + search + filter)
- ☐ Assignment tracking (append-only)
- ☐ Maintenance logging (append-only)
- ☐ Dashboard with stats + warranty alerts
- ☐ Reports + CSV export
- ☐ QR asset tags
- ☐ Document attachments
- ☐ Seeded demo data (5 role logins)
- ☐ Deployed at a URL

## Completed this session
- Repo scaffold: Vite + React 18 + TS strict + Tailwind (IATS design tokens) + ESLint/Prettier/Vitest — all gates green (9/9 tests, build passes).
- Migrations 0001–0004: full schema (tenant-aware), triggers (updated_at, audit, status guards, append-only guards), dashboard views (security_invoker), RLS default-deny for all 5 roles, storage bucket policies.
- App shell: dark-ink sidebar with IATS logo/wordmark, role-gated nav, mobile drawer, login page, auth context (session + profile/role), protected routes, page skeletons.
- Progress/decision/handoff/issues files + skills folders initialized.

## Next (ordered)
1. **BLOCKER: obtain Supabase project URL + anon key + service-role key from owner**; put in `.env`.
2. Apply migrations 0001–0004 to the Supabase project (SQL editor or `supabase db push`).
3. Seed org + 5 demo users (script to be written: `scripts/seed.ts`).
4. Slice 1: admin user management UI + RLS SQL tests (`tests/rls/`).
5. Slice 2: assets CRUD.

## Known issues / blockers
- No Supabase credentials yet — everything DB-dependent is untested against a live database.
- 1 benign lint warning (react-refresh, AuthContext exports hook + provider).

## How to verify current state
```bash
npm install
npm run typecheck && npm run lint && npm run test && npm run build   # all green
npm run dev   # requires .env with Supabase keys; login page renders
```
