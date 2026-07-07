# IATS — ICT Assets Tracker System

Production-grade ICT asset management for schools, NGOs, and businesses: every asset, who has it, where it is, its repair history, and when its warranty expires. Single source of truth with an unalterable chain of custody.

## Architecture
- **Frontend:** React 18 + Vite + TypeScript (strict), TailwindCSS, TanStack Query, zod
- **Backend:** Supabase — Postgres with row-level security (all access control enforced in the database), Auth, Storage
- **History integrity:** assignments/maintenance/audit are append-only (RLS + triggers); corrections are compensating rows
- **Tenancy:** every core table carries `organization_id` from day one

## Setup from zero (~10 min)
1. **Clone & install:** `npm install`
2. **Supabase:** create a project at supabase.com → SQL editor → run `supabase/migrations/0001…0004` in order.
3. **Env:** copy `.env.example` → `.env`; fill `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (Settings → API).
4. **Seed:** run the seed script (see HANDOFF.md) to create the org, departments, and demo users.
5. **Run:** `npm run dev` → http://localhost:5173

## Env vars
| Var | Where used | Notes |
|-----|------------|-------|
| `VITE_SUPABASE_URL` | client | project URL |
| `VITE_SUPABASE_ANON_KEY` | client | anon public key (safe to expose; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | seed scripts only | NEVER in client code or committed |

## Scripts
`npm run dev` · `build` · `preview` · `lint` · `test` · `typecheck` · `gen:types`

## Roles
super_admin · ict_manager · technician · auditor · staff — capability matrix in `src/features/auth/roles.ts`, enforced by RLS in `supabase/migrations/0003_rls.sql`.

## Project docs
`PROGRESS.md` (state) · `DECISIONS.md` (ADR log) · `HANDOFF.md` (cold start) · `ISSUES.md` · `/skills` (reusable procedures)
