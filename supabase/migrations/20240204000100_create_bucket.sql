-- Create a new migration file to ensure the storage bucket exists
-- This inserts into storage.buckets if it doesn't exist
insert into storage.buckets (id, name, public)
select 'gastos', 'gastos', true
where not exists (
    select 1 from storage.buckets where id = 'gastos'
);

-- Ensure policies exist (re-applying just in case)
-- Note: In pure SQL, "create policy if not exists" is not standard in older Postgres versions, 
-- so specific DO block or simple drop/create is often used. 
-- Here we trust the previous migration created policies, or we can drop/recreate to be safe.

drop policy if exists "Gastos visibles para autenticados" on storage.objects;
create policy "Gastos visibles para autenticados"
  on storage.objects for select
  using ( bucket_id = 'gastos' and auth.role() = 'authenticated' );

drop policy if exists "Gastos subibles para autenticados" on storage.objects;
create policy "Gastos subibles para autenticados"
  on storage.objects for insert
  with check ( bucket_id = 'gastos' and auth.role() = 'authenticated' );

drop policy if exists "Gastos actualizables para autenticados" on storage.objects;
create policy "Gastos actualizables para autenticados"
  on storage.objects for update
  using ( bucket_id = 'gastos' and auth.role() = 'authenticated' );
