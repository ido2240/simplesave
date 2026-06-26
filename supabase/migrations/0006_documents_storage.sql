-- Real document storage. A private "documents" bucket + a column to hold the
-- stored object path. Demo access mirrors the app tables (anon/authenticated
-- full access on this bucket; production would key policies to the owner).
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists demo_documents_all on storage.objects;
create policy demo_documents_all on storage.objects
  for all to anon, authenticated
  using (bucket_id = 'documents')
  with check (bucket_id = 'documents');

alter table public.documents add column if not exists storage_path text;
