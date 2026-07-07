# DECISIONS — append-only architecture decision log

## 2026-07-07 — Stack (from build spec §4, final)
- **React 18 + Vite + TypeScript strict** — fast dev loop, typed contracts. Trade-off: SPA, no SSR (fine for authed internal tool).
- **TailwindCSS + shadcn-style components** — speed + consistent premium base.
- **Supabase (Postgres + Auth + RLS + Storage)** — DB-level security as configuration; chosen over NestJS for solo-maintainer economics. Data portable (plain Postgres).
- **Vercel/Netlify hosting** — git-push deploys; owner already uses Netlify.
- **Client-side QR** (`qrcode` npm) — no server dependency.
- **Vitest + RTL; RLS tested via SQL scripts.**

## 2026-07-07 — Branding: IATS
Owner chose system name "ICT Assets Tracker System", abbreviated **IATS**. Logo is an SVG monogram (ink tile, off-white I/A, ember slash) built in `src/components/branding/IatsLogo.tsx` — no external asset dependency.

## 2026-07-07 — Views use `security_invoker`
Dashboard views (`v_asset_stats` etc.) are set `security_invoker = true` so base-table RLS applies to view queries. Alternative (security-definer views with own filtering) rejected: duplicates policy logic.

## 2026-07-07 — Append-only enforcement: policy + trigger, not just grants
Assignments allow UPDATE only on open rows (return recording), with a trigger rejecting changes to immutable fact columns. Maintenance logs have no UPDATE/DELETE policy at all, plus revoked grants. Rationale: RLS policy absence = default-deny; triggers give clear human error messages.

## 2026-07-07 — Hand-written domain types until project is linked
`src/lib/types.ts` mirrors migrations exactly; will be superseded by `supabase gen types` (`npm run gen:types`) once the Supabase project exists. Consequence: keep types in sync manually until then.

## 2026-07-07 — Sonner for toasts, date-fns for dates, no chart lib yet
Dashboard v1 uses stat cards + lists (no charts), so no chart dependency until a report needs one.
