# project-conventions

**When to use:** any work in this repo. Read PROGRESS.md first, always.

## Structure
- `src/features/<feature>/` — pages, components, and ONE data-access file (`api.ts`) per feature. No ad-hoc Supabase calls in components.
- `src/components/ui/` shared primitives; `src/lib/` client, types, utils.
- `supabase/migrations/` ordered SQL — never mutate DB without a migration.

## Data layer
- TanStack React Query for ALL server state (no server data in useState).
- zod schemas shared between forms and api functions.
- Every remote call handles loading / error / empty. Errors surfaced as human sentences.

## Quality gate (run after every feature, all must be green before "done")
```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## Git
- Conventional commits (`feat:`, `fix:`, `chore:`…), one logical change per commit, commit at every green checkpoint.

## Process
- Update PROGRESS.md at end of every task/session; DECISIONS.md for non-trivial choices; ISSUES.md for anything deferred.
- Role checks in UI (`features/auth/roles.ts`) are convenience only — the database RLS is authoritative.
