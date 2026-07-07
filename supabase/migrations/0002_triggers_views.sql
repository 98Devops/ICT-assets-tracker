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
