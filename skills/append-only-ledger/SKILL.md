# append-only-ledger

**When to use:** designing/altering `assignments`, `maintenance_logs`, `audit_log`, or any history table.

## Design rules
- Rows are facts. Corrections are **new compensating rows**, never edits.
- "Open" state = a null terminal column (`returned_date is null`). Enforce single-open with a partial unique index:
```sql
create unique index one_open_assignment_per_asset on assignments(asset_id) where returned_date is null;
```
- Closing a record is the only permitted UPDATE, restricted two ways:
  - RLS policy `using (... and returned_date is null)`;
  - trigger raising on any change to immutable fact columns or to already-closed rows.
- No DELETE policy ever. Also `revoke delete`.

## Querying
- Current holder: `where returned_date is null`.
- Timeline: order by `assigned_date/created_at desc`, render open row as "in custody".
- Never store derived counts; use views (`v_open_assignments`, `v_repeat_repairs`).
