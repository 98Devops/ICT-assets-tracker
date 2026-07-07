-- IATS 0003: RLS — default-deny, org-scoped, role-enforced. Append-only via absent UPDATE/DELETE policies.

-- helper: current user's org and role (stable, used inside policies)
create or replace function auth_org() returns uuid language sql stable security definer as $$
  select organization_id from profiles where id = auth.uid()
$$;
create or replace function auth_role() returns app_role language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;
create or replace function auth_department() returns uuid language sql stable security definer as $$
  select department_id from profiles where id = auth.uid()
$$;

alter table organizations enable row level security;
alter table departments enable row level security;
alter table profiles enable row level security;
alter table suppliers enable row level security;
alter table assets enable row level security;
alter table assignments enable row level security;
alter table maintenance_logs enable row level security;
alter table attachments enable row level security;
alter table audit_log enable row level security;

-- organizations: members read own org; only super_admin updates
create policy org_read on organizations for select
  using (id = auth_org());
create policy org_update on organizations for update
  using (id = auth_org() and auth_role() = 'super_admin');

-- departments: all org members read; admin/manager manage
create policy dept_read on departments for select using (organization_id = auth_org());
create policy dept_write on departments for insert
  with check (organization_id = auth_org() and auth_role() in ('super_admin','ict_manager'));
create policy dept_update on departments for update
  using (organization_id = auth_org() and auth_role() in ('super_admin','ict_manager'));
create policy dept_delete on departments for delete
  using (organization_id = auth_org() and auth_role() = 'super_admin');

-- profiles: everyone reads own profile; privileged roles read org; super_admin manages
create policy profile_read_own on profiles for select using (id = auth.uid());
create policy profile_read_org on profiles for select
  using (organization_id = auth_org() and auth_role() in ('super_admin','ict_manager','technician','auditor'));
create policy profile_admin_update on profiles for update
  using (organization_id = auth_org() and auth_role() = 'super_admin');
create policy profile_admin_insert on profiles for insert
  with check (organization_id = auth_org() and auth_role() = 'super_admin');

-- suppliers
create policy suppliers_read on suppliers for select
  using (organization_id = auth_org() and auth_role() in ('super_admin','ict_manager','technician','auditor'));
create policy suppliers_write on suppliers for insert
  with check (organization_id = auth_org() and auth_role() in ('super_admin','ict_manager'));
create policy suppliers_update on suppliers for update
  using (organization_id = auth_org() and auth_role() in ('super_admin','ict_manager'));
create policy suppliers_delete on suppliers for delete
  using (organization_id = auth_org() and auth_role() = 'super_admin');

-- assets: staff see own dept only; others org-wide. Delete = super_admin only (audited).
create policy assets_read on assets for select using (
  organization_id = auth_org() and (
    auth_role() in ('super_admin','ict_manager','technician','auditor')
    or (auth_role() = 'staff' and (department_id = auth_department()
        or id in (select asset_id from assignments where assigned_to = auth.uid())))
  )
);
create policy assets_insert on assets for insert with check (
  organization_id = auth_org() and auth_role() in ('super_admin','ict_manager','technician')
);
create policy assets_update on assets for update using (
  organization_id = auth_org() and auth_role() in ('super_admin','ict_manager','technician')
);
create policy assets_delete on assets for delete using (
  organization_id = auth_org() and auth_role() = 'super_admin'
);

-- assignments: append-only (no update/delete policies except closing the return)
create policy assignments_read on assignments for select using (
  organization_id = auth_org() and (
    auth_role() in ('super_admin','ict_manager','technician','auditor')
    or assigned_to = auth.uid()
  )
);
create policy assignments_insert on assignments for insert with check (
  organization_id = auth_org() and auth_role() in ('super_admin','ict_manager','technician')
);
-- recording a return: only setting returned fields on an open row.
-- Enforced further by trigger below to prevent editing history fields.
create policy assignments_return on assignments for update using (
  organization_id = auth_org()
  and auth_role() in ('super_admin','ict_manager','technician')
  and returned_date is null
);

create or replace function guard_assignment_update() returns trigger language plpgsql as $$
begin
  if old.returned_date is not null then
    raise exception 'Assignment history is append-only; closed records cannot be edited.';
  end if;
  if new.asset_id  is distinct from old.asset_id
     or new.assigned_to is distinct from old.assigned_to
     or new.assigned_by is distinct from old.assigned_by
     or new.assigned_date is distinct from old.assigned_date
     or new.organization_id is distinct from old.organization_id then
    raise exception 'Only return fields may be set; assignment facts are immutable.';
  end if;
  return new;
end $$;
create trigger assignments_update_guard before update on assignments
  for each row execute function guard_assignment_update();

-- maintenance_logs: strictly append-only (no update/delete policies at all)
create policy maintenance_read on maintenance_logs for select using (
  organization_id = auth_org() and (
    auth_role() in ('super_admin','ict_manager','technician','auditor')
    or asset_id in (select asset_id from assignments where assigned_to = auth.uid())
  )
);
create policy maintenance_insert on maintenance_logs for insert with check (
  organization_id = auth_org() and auth_role() in ('super_admin','ict_manager','technician')
);

-- attachments
create policy attachments_read on attachments for select using (
  organization_id = auth_org() and auth_role() in ('super_admin','ict_manager','technician','auditor')
);
create policy attachments_insert on attachments for insert with check (
  organization_id = auth_org() and auth_role() in ('super_admin','ict_manager','technician')
);
create policy attachments_delete on attachments for delete using (
  organization_id = auth_org() and auth_role() in ('super_admin','ict_manager')
);

-- audit_log: read-only for admin/manager/auditor; writes only via triggers (security definer)
create policy audit_read on audit_log for select using (
  organization_id = auth_org() and auth_role() in ('super_admin','ict_manager','auditor')
);

-- revoke direct grants that could bypass intent (belt and braces)
revoke update, delete on maintenance_logs from authenticated;
revoke delete on assignments from authenticated;
revoke update, delete on audit_log from authenticated;
