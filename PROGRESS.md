# PROGRESS — IATS (ICT Assets Tracker System)

> Master state file. Read this first. Status legend: ☐ todo · ◐ in progress · ✅ done-and-verified.

## Current phase
**DEPLOYED & DEMOABLE + gap-fix pass done** — https://iats-tracker.netlify.app
Value pass shipped (CSV import, user-mgmt UI, branded reports + depreciation, QR scanner, org logo,
due-maintenance stat, sortable columns). Gap pass closed G-5/7/8/9 (see TECHNICAL_DEBT.md).
Remaining opens are all owner-blocked: G-1 (Supabase access token), G-2 (rotate DB password),
G-3 (same token), G-4 (Netlify UI link). Suite: 41/41 tests + 14/14 RLS checks.

## Requirement checklist (from build spec)
- ✅ Secure auth with role-based access — RLS enforced at DB, proven by `tests/rls-check.mjs` (14/14 against live DB)
- ✅ Full asset register — CRUD, search (name/serial/tag), filters (category/status/department), pagination
- ✅ Assignment tracking — append-only, one-open-assignment index, custody timeline, overdue flags
- ✅ Maintenance logging — append-only, history with costs, repeat-repair flag (≥3 repairs)
- ✅ Dashboard — live stat views, 60/30-day warranty alerts, activity feed (audit log)
- ✅ Reports — inventory / valuation / maintenance-cost / lost+retired, date-range filter, CSV export
- ✅ QR asset tags — per-asset QR (deep link, auth-gated) + printable label sheet
- ✅ Document attachments — private bucket, signed URLs, kind labels
- ✅ Seeded demo data — Kumbudzi High School, 20 assets, 5 role logins, story-rich histories
- ✅ Deployed at a URL — https://iats-tracker.netlify.app (smoke: 200 on / and SPA routes)

## Verified how
- `npm run typecheck && npm run lint && npm run test && npm run build` — green (9 unit tests)
- `node tests/rls-check.mjs` — 14/14 role-matrix + append-only + guard checks vs live DB
- Live URL responds 200 with SPA fallback

## Next (ordered)
1. Manual browser smoke of each role (login → flows) — owner should demo-run once
2. Component tests for critical flows (asset create, assign/return, role-gated rendering)
3. Polish audit: mobile responsiveness on real phone, WCAG contrast pass
4. `npm run gen:types` to replace hand-written types (needs supabase CLI link)
5. Consider custom domain + Netlify git-linked CI deploys

## Known issues / blockers
- See ISSUES.md. No blockers.

## How to verify current state
```bash
npm install && npm run typecheck && npm run lint && npm run test && npm run build
node tests/rls-check.mjs
# then open https://iats-tracker.netlify.app — creds in HANDOFF.md
```
