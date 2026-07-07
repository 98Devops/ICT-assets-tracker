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
