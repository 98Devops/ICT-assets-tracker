-- IATS 0001: core schema. All tables tenant-aware (organization_id) from day one.

create extension if not exists "pgcrypto";

-- enums
create type app_role as enum ('super_admin', 'ict_manager', 'technician', 'auditor', 'staff');
create type asset_category as enum (
  'laptop','desktop','printer','projector','interactive_screen','router','switch',
  'cctv','access_control','software_license','other'
);
create type asset_status as enum ('active','faulty','in_repair','retired','lost');
create type maintenance_type as enum ('repair','service','inspection','part_replacement');
create type attachment_kind as enum ('invoice','warranty','photo','other');

-- organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- departments
create table departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

-- profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  full_name text not null,
  role app_role not null default 'staff',
  department_id uuid references departments(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- suppliers
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  contact text,
  created_at timestamptz not null default now()
);

-- assets
create table assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  asset_tag text not null,
  name text not null,
  category asset_category not null,
  serial_number text,
  model text,
  supplier_id uuid references suppliers(id),
  purchase_date date,
  cost numeric(12,2),
  warranty_expiry date,
  status asset_status not null default 'active',
  condition text,
  location text,
  department_id uuid references departments(id),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, asset_tag)
);
create index assets_org_status_idx on assets(organization_id, status);
create index assets_org_category_idx on assets(organization_id, category);
create index assets_search_idx on assets using gin (
  to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(serial_number,'') || ' ' || coalesce(asset_tag,''))
);

-- assignments (append-only)
create table assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  asset_id uuid not null references assets(id),
  assigned_to uuid not null references profiles(id),
  assigned_by uuid not null references profiles(id),
  assigned_date date not null default current_date,
  expected_return_date date,
  returned_date date,
  return_condition text,
  notes text,
  created_at timestamptz not null default now()
);
-- at most one open assignment per asset
create unique index one_open_assignment_per_asset
  on assignments(asset_id) where returned_date is null;
create index assignments_org_asset_idx on assignments(organization_id, asset_id);
create index assignments_assigned_to_idx on assignments(assigned_to);

-- maintenance_logs (append-only)
create table maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  asset_id uuid not null references assets(id),
  date date not null default current_date,
  type maintenance_type not null,
  description text not null,
  parts_replaced text,
  cost numeric(12,2),
  performed_by text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index maintenance_org_asset_idx on maintenance_logs(organization_id, asset_id);

-- attachments
create table attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  asset_id uuid not null references assets(id),
  storage_path text not null,
  file_name text not null,
  kind attachment_kind not null default 'other',
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index attachments_org_asset_idx on attachments(organization_id, asset_id);

-- audit_log (append-only, trigger-populated)
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  table_name text not null,
  record_id uuid not null,
  action text not null,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  diff jsonb
);
create index audit_org_time_idx on audit_log(organization_id, changed_at desc);
-- IATS 0002: triggers (updated_at, audit, status guards) and dashboard views.

-- updated_at maintenance
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger assets_updated_at before update on assets
  for each row execute function set_updated_at();
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- audit trigger on assets (who changed what)
create or replace function audit_assets() returns trigger language plpgsql security definer as $$
declare
  v_diff jsonb;
begin
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, jsonb_build_object('old', o.value, 'new', n.value))
      into v_diff
      from jsonb_each(to_jsonb(old)) o
      join jsonb_each(to_jsonb(new)) n on o.key = n.key
      where o.value is distinct from n.value;
  elsif tg_op = 'INSERT' then
    v_diff = to_jsonb(new);
  else
    v_diff = to_jsonb(old);
  end if;

  insert into audit_log (organization_id, table_name, record_id, action, changed_by, diff)
  values (
    coalesce(new.organization_id, old.organization_id),
    tg_table_name,
    coalesce(new.id, old.id),
    tg_op,
    auth.uid(),
    v_diff
  );
  return coalesce(new, old);
end $$;

create trigger assets_audit after insert or update or delete on assets
  for each row execute function audit_assets();

-- status guard: an asset with an open assignment cannot be retired/lost
create or replace function guard_asset_status() returns trigger language plpgsql as $$
begin
  if new.status in ('retired','lost') and old.status is distinct from new.status then
    if exists (select 1 from assignments a where a.asset_id = new.id and a.returned_date is null) then
      raise exception 'Asset has an open assignment; record the return before marking it % .', new.status;
    end if;
  end if;
  return new;
end $$;

create trigger assets_status_guard before update on assets
  for each row execute function guard_asset_status();

-- assignment guard: cannot assign a retired/lost asset
create or replace function guard_new_assignment() returns trigger language plpgsql as $$
declare v_status asset_status;
begin
  select status into v_status from assets where id = new.asset_id;
  if v_status in ('retired','lost') then
    raise exception 'Cannot assign an asset with status %', v_status;
  end if;
  return new;
end $$;

create trigger assignments_guard before insert on assignments
  for each row execute function guard_new_assignment();

-- Dashboard views (derived data is queried, never stored)
create or replace view v_asset_stats as
select
  organization_id,
  count(*) as total,
  count(*) filter (where status = 'active') as active,
  count(*) filter (where status = 'faulty') as faulty,
  count(*) filter (where status = 'in_repair') as in_repair,
  count(*) filter (where status = 'retired') as retired,
  count(*) filter (where status = 'lost') as lost,
  coalesce(sum(cost) filter (where status not in ('retired','lost')), 0) as active_value
from assets
group by organization_id;

create or replace view v_warranty_alerts as
select a.*,
  (a.warranty_expiry - current_date) as days_left,
  case when a.warranty_expiry - current_date <= 30 then '30' else '60' end as alert_band
from assets a
where a.warranty_expiry is not null
  and a.warranty_expiry >= current_date
  and a.warranty_expiry - current_date <= 60
  and a.status not in ('retired','lost');

create or replace view v_open_assignments as
select asg.*, a.name as asset_name, a.asset_tag,
       p.full_name as assigned_to_name
from assignments asg
join assets a on a.id = asg.asset_id
join profiles p on p.id = asg.assigned_to
where asg.returned_date is null;

create or replace view v_repeat_repairs as
select organization_id, asset_id, count(*) as repair_count
from maintenance_logs
where type = 'repair'
group by organization_id, asset_id
having count(*) >= 3;

-- views run with invoker's rights so RLS on base tables applies
alter view v_asset_stats set (security_invoker = true);
alter view v_warranty_alerts set (security_invoker = true);
alter view v_open_assignments set (security_invoker = true);
alter view v_repeat_repairs set (security_invoker = true);
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
-- IATS 0004: storage bucket for asset attachments (private; access via RLS).
insert into storage.buckets (id, name, public)
values ('asset-attachments', 'asset-attachments', false)
on conflict (id) do nothing;

create policy attachments_storage_read on storage.objects for select
  using (bucket_id = 'asset-attachments'
    and auth_role() in ('super_admin','ict_manager','technician','auditor'));

create policy attachments_storage_write on storage.objects for insert
  with check (bucket_id = 'asset-attachments'
    and auth_role() in ('super_admin','ict_manager','technician'));

create policy attachments_storage_delete on storage.objects for delete
  using (bucket_id = 'asset-attachments'
    and auth_role() in ('super_admin','ict_manager'));
