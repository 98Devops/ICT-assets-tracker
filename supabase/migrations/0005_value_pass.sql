-- IATS 0005: buyer-value pass — depreciation, org logo, due-maintenance view, wider audit coverage.

-- straight-line depreciation input
alter table assets add column if not exists useful_life_years int not null default 4
  check (useful_life_years between 1 and 30);

-- category-sensible defaults for existing rows
update assets set useful_life_years = case category
  when 'laptop' then 4
  when 'desktop' then 5
  when 'printer' then 5
  when 'projector' then 5
  when 'interactive_screen' then 6
  when 'router' then 5
  when 'switch' then 6
  when 'cctv' then 5
  when 'access_control' then 5
  when 'software_license' then 1
  else 4
end;

-- org logo
alter table organizations add column if not exists logo_path text;

-- public-read logo bucket; only super_admin writes
insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

create policy org_logos_read on storage.objects for select
  using (bucket_id = 'org-logos');
create policy org_logos_write on storage.objects for insert
  with check (bucket_id = 'org-logos' and auth_role() = 'super_admin');
create policy org_logos_update on storage.objects for update
  using (bucket_id = 'org-logos' and auth_role() = 'super_admin');
create policy org_logos_delete on storage.objects for delete
  using (bucket_id = 'org-logos' and auth_role() = 'super_admin');

-- due for maintenance: in-service assets never maintained or not maintained in 180 days
create or replace view v_due_maintenance as
select a.*, m.last_maintenance
from assets a
left join (
  select asset_id, max(date) as last_maintenance
  from maintenance_logs
  group by asset_id
) m on m.asset_id = a.id
where a.status in ('active','faulty')
  and a.category <> 'software_license'
  and (m.last_maintenance is null or m.last_maintenance < current_date - interval '180 days');
alter view v_due_maintenance set (security_invoker = true);

-- generalize audit to other tables (INSERT-only tables audit inserts; mutable tables audit everything)
create trigger assignments_audit after insert or update on assignments
  for each row execute function audit_assets();
create trigger maintenance_audit after insert on maintenance_logs
  for each row execute function audit_assets();
create trigger departments_audit after insert or update or delete on departments
  for each row execute function audit_assets();
create trigger suppliers_audit after insert or update or delete on suppliers
  for each row execute function audit_assets();

-- profiles need a bespoke audit row builder? no — same shape works (has organization_id + id)
create trigger profiles_audit after insert or update on profiles
  for each row execute function audit_assets();
