# TECHNICAL_DEBT — IATS status, testing guide & open debt

> Full traceability against the build spec (`ict asset tracker.md`), a manual test procedure per
> requirement, and the honest ledger of what's still owed. Updated whenever a gap opens or closes.
> Last updated: **2026-07-07** (post gap-fix pass, 41/41 tests).

---

## 1. How the system works (architecture in five sentences)

IATS is a React 18 + Vite + TypeScript (strict) SPA on Netlify, backed entirely by Supabase
(Postgres + Auth + Storage + one Edge Function) — there is no custom server. Every access rule is
enforced **twice**: once in the UI for UX (`src/features/auth/roles.ts`) and once for real in
Postgres row-level security (`supabase/migrations/0003_rls.sql`) — the database is authoritative,
so a tampered client hits a wall. Assignment and maintenance history are **append-only**: closed
records physically cannot be edited or deleted (no RLS policy exists for it, grants revoked,
triggers reject fact changes) — corrections are new rows. Every table carries `organization_id`,
so the single-org v1 schema is already multi-tenant SaaS-shaped. All dashboard numbers come from
Postgres views (`v_asset_stats`, `v_warranty_alerts`, `v_due_maintenance`), never client-side
summing, so they cannot drift from the source tables.

**Live:** https://iats-tracker.netlify.app · **Repo:** https://github.com/98Devops/ICT-assets-tracker
**Supabase:** project `fzrxhhktpscrxjrotzon` (eu-central-1) · **Deploy:** `npm run build && npx netlify deploy --prod --dir dist`

### Test credentials (org: Kumbudzi High School — password for all: `IATS-demo-2026!`)

| Role | Email | Proves |
|---|---|---|
| super_admin | admin@iats.demo | Everything + Admin panel + audit log |
| ict_manager | manager@iats.demo | Full asset ops, no user management |
| technician | tech@iats.demo | Create/edit, no delete |
| auditor | auditor@iats.demo | Read-everything, write-nothing |
| staff | staff@iats.demo | Own department + own assignments only |

---

## 2. Requirement traceability & how to test each one

All 10 definition-of-done items from the spec, each with a manual test. Automated proof lives in
`npm run test` (41 tests) and `node tests/rls-check.mjs` (14 live-DB checks).

### 2.1 Secure auth with role-based access (DB-enforced) — ✅ verified
- **Test:** Log in as `staff@iats.demo` → sidebar has no Reports/Admin; the Assets list shows only
  Sciences-dept + own-assignment items. Log in as `admin@iats.demo` → everything visible.
- **Proof beyond the UI:** `node tests/rls-check.mjs` queries the database directly as each role —
  14/14, including staff INSERT rejection and auditor UPDATE rejection.

### 2.2 Full asset register (CRUD + search + filter) — ✅ verified
- **Test:** Assets → *Register asset* → save → search its serial → filter by category/status/dept →
  open → *Edit* → change location → verify. Column headers Tag/Name/Cost/Status sort on click.
- **Note:** "delete" = status→retired/lost; hard delete is super_admin-only at the RLS layer.

### 2.3 Assignment tracking (chain of custody, append-only) — ✅ verified
- **Test:** Open an unassigned asset → *Assign* → person + dates → save. Try assigning again →
  rejected ("already assigned"). *Record return* with condition → both events on the timeline.
- **Proof:** RLS check "closed assignments are immutable (even for admin)" edits a returned record
  directly and confirms the DB refuses. Component tests: `AssignForm.test.tsx`, `ReturnForm.test.tsx`.

### 2.4 Maintenance logging (append-only) — ✅ verified
- **Test:** Open `ICT-0003` → header shows the "⚠ repairs — review" flag; maintenance tab lists 4
  chronological entries with costs. Log a new entry via *Log maintenance*.
- **Proof:** maintenance table has **no** UPDATE/DELETE policy at all + revoked grants.
  Component test: `MaintenanceForm.test.tsx`.

### 2.5 Dashboard (live stats + warranty alerts) — ✅ verified
- **Test:** Dashboard as admin → 6 stat cards (incl. *Due maintenance* = no service in 180 days),
  warranty list with 30/60-day bands (seeded assets expire soon), audit-log activity feed.

### 2.6 Reports (date-range + CSV export) — ✅ verified
- **Test:** Reports → each tab (Inventory / Valuation / Maintenance cost / Lost-missing) → set a
  date range → *Export CSV*. Valuation shows purchase value **and** straight-line book value.
  *Print report* renders a branded header (org logo + name + generated-by).
- **Note:** PDF export = spec'd nice-to-have, intentionally not built (print path covers it).

### 2.7 QR asset tags (generate + scan-to-view) — ✅ verified
- **Test:** Asset detail shows its QR → Reports → *QR labels* → *Print label sheet*. Sidebar →
  *Scan* → camera decodes a label → opens the asset (manual tag entry as fallback). Deep links are
  auth-gated: an unauthenticated scan lands on login first.

### 2.8 Document attachments — ✅ verified
- **Test:** Asset detail → pick kind → upload → opens via time-limited signed URL (private bucket).
  Oversize (>10 MB), empty, or executable files are now rejected *before* upload with a clear message.

### 2.9 Seeded demo data — ✅ verified
- 20 assets across all categories, mixed statuses, warranties expiring inside 30 days, a repeat-repair
  laptop with documented history, 5 role users. Re-seed on a **fresh** DB: `node scripts/seed.mjs`.

### 2.10 Deployed at a URL — ✅ verified
- https://iats-tracker.netlify.app — HTTPS, SPA fallback, security headers (`netlify.toml`).

---

## 3. Technical debt ledger

| ID | Sev | Item | Status |
|----|-----|------|--------|
| G-1 | HIGH | `create-user` Edge Function written but **not deployed** — Admin → *Add user* fails until then | **OPEN — blocked on owner** |
| G-2 | HIGH | DB password was pasted in plaintext chat during setup | **OPEN — owner action** |
| G-3 | MED | Generated DB types (`supabase gen types`) not wired; hand-written `types.ts` can drift | **OPEN — blocked on owner** |
| G-4 | MED | Deploys manual via CLI; site not git-linked to GitHub for push-to-deploy | **OPEN — owner action** |
| G-5 | MED | Component tests missing for assign/return/maintenance flows | **CLOSED 2026-07-07** — 8 tests across `AssignForm/ReturnForm/MaintenanceForm.test.tsx`; suite now 41 |
| G-6 | LOW | No PDF export | **WON'T FIX** unless a buyer asks — spec'd optional; branded print path exists |
| G-7 | LOW | Reports fetched unbounded result sets | **CLOSED 2026-07-07** — `fetchAllPages` pages in 1000-row chunks (`ReportsPage.tsx`) |
| G-8 | LOW | No password-reset flow | **CLOSED 2026-07-07** — *Forgot password?* on login + `/reset-password` page (non-enumerating message) |
| G-9 | LOW | No client-side attachment validation | **CLOSED 2026-07-07** — `validateAttachment` (10 MB cap, type allowlist) + 6 unit tests |

### G-1 — deploy the user-management function *(owner: ~5 min)*
1. https://supabase.com/dashboard/account/tokens → *Generate new token*.
2. `SUPABASE_ACCESS_TOKEN=<token> npx supabase functions deploy create-user --project-ref fzrxhhktpscrxjrotzon`
   (or paste the token in chat and the agent runs it).
3. Verify: Admin → *Add user* → create a test user → log in as them.

### G-2 — rotate the DB password *(owner: ~2 min)*
Supabase → Settings → Database → *Reset database password* → update `DB_PASSWORD` in local `.env`
(never committed). Nothing else references it.

### G-3 — generated DB types *(blocked on the same token as G-1)*
`--db-url` mode requires local Docker (not available on this machine); API mode requires the access
token. Once available: `npx supabase gen types typescript --project-id fzrxhhktpscrxjrotzon > src/lib/database.types.ts`,
then re-point `src/lib/types.ts` aliases at the generated definitions. Until then, any schema
migration **must** be mirrored in `src/lib/types.ts` by hand — this is the drift risk.

### G-4 — git-linked deploys *(owner: ~2 min, UI-only)*
Netlify dashboard → site `iats-tracker` → *Site configuration → Build & deploy → Link repository* →
GitHub → `98Devops/ICT-assets-tracker`, branch `main`. Build settings are already in `netlify.toml`
(command `npm run build`, publish `dist`). Set env vars are already present on the site. After
linking, every push to `main` deploys automatically and the manual CLI path stays as a fallback.

---

## 4. Verification commands (run all before calling anything done)

```bash
npm run typecheck && npm run lint && npm run test && npm run build   # 41/41, 0 errors
node tests/rls-check.mjs                                             # 14/14 vs live DB
```

Manual smoke: log in as each of the 5 roles at the live URL and walk §2 above (~15 min total).
