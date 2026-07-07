# ISSUES — known bugs & deferred items

> The authoritative gap ledger now lives in **TECHNICAL_DEBT.md** (G-1…G-9 with fix steps).

| # | Severity | Item | Status |
|---|----------|------|--------|
| 1 | ~~blocker~~ | Supabase credentials — provided 2026-07-07; migrations applied, seeded | closed |
| 2 | low | react-refresh lint warning in `AuthContext.tsx` (hook + provider in one file) | accepted |
| 3 | info | PDF export deferred (spec: nice-to-have; branded print path exists) | deferred |
| 4 | high | G-1: `create-user` Edge Function not deployed (needs owner's Supabase access token) | open |
| 5 | high | G-2: DB password shared in chat — rotate it | open |
| 6 | med | G-3: generated DB types blocked on same token (or local Docker) | open |
| 7 | med | G-4: Netlify not git-linked (owner UI action, ~2 min) | open |
