# supabase-rls-patterns

**When to use:** writing or reviewing any RLS policy in this project (or any Supabase multi-role app).

## Core pattern
1. Helper functions (SECURITY DEFINER, STABLE) read the caller's org/role once:
```sql
create or replace function auth_org() returns uuid language sql stable security definer as $$
  select organization_id from profiles where id = auth.uid()
$$;
create or replace function auth_role() returns app_role language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;
```
2. Enable RLS on **every** table; absence of a policy = default-deny.
3. Every policy starts with `organization_id = auth_org()` (tenant scope), then role checks:
```sql
create policy assets_insert on assets for insert with check (
  organization_id = auth_org() and auth_role() in ('super_admin','ict_manager','technician')
);
```
4. Append-only tables: create SELECT + INSERT policies only. Belt-and-braces: `revoke update, delete on <table> from authenticated;`
5. Views: `alter view v_x set (security_invoker = true);` so base RLS applies.
6. Trigger-written tables (audit_log): trigger function is SECURITY DEFINER; clients get read-only policy.

## Gotchas
- Helper functions must be SECURITY DEFINER or they recurse into profiles' own RLS.
- `with check` guards INSERT/UPDATE new rows; `using` guards visibility/old rows — UPDATE usually needs both.
- Test per-role with scripted `set local role authenticated; set local request.jwt.claims = '{"sub":"<uid>"}';` blocks.
