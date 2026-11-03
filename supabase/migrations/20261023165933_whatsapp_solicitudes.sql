-- Intake is separate from invoices, stock and budgets. No sales are created here.
create table public.whatsapp_solicitudes (
  id uuid primary key default gen_random_uuid(),
  message_id text not null unique,
  phone_number_id text not null,
  telefono text not null,
  nombre text not null default '',
  cliente_id uuid references public.clientes(id) on delete set null,
  tipo text not null,
  texto text not null,
  recibido_at timestamptz not null,
  created_at timestamptz not null default now(),
  clasificacion text check (clasificacion in ('pedido', 'consulta', 'revision_manual')),
  propuesta jsonb,
  procesamiento text not null default 'recibido' check (procesamiento in ('recibido', 'procesando', 'completado')),
  lease_id uuid,
  lease_at timestamptz,
  error_analisis boolean not null default false,
  revision text not null default 'pendiente' check (revision in ('pendiente', 'revisado', 'descartado')),
  aviso_estado text not null default 'no_necesario' check (aviso_estado in ('no_necesario', 'pendiente', 'enviando', 'aceptado_meta', 'revisar_error')),
  aviso_at timestamptz,
  aviso_message_id text
);
create index whatsapp_solicitudes_procesamiento_idx on public.whatsapp_solicitudes(procesamiento, created_at);
create index whatsapp_solicitudes_aviso_idx on public.whatsapp_solicitudes(aviso_estado, created_at);
create index whatsapp_solicitudes_revision_idx on public.whatsapp_solicitudes(revision, created_at desc);
create index whatsapp_solicitudes_cliente_idx on public.whatsapp_solicitudes(cliente_id);
alter table public.whatsapp_solicitudes enable row level security;
revoke all on public.whatsapp_solicitudes from anon, authenticated;
grant select on public.whatsapp_solicitudes to authenticated;
grant update (revision) on public.whatsapp_solicitudes to authenticated;
grant all on public.whatsapp_solicitudes to service_role;
create policy whatsapp_admin_select on public.whatsapp_solicitudes for select to authenticated
using (exists (select 1 from public.usuarios u where u.id = (select auth.uid()) and u.activo and u.rol = 'admin'));
create policy whatsapp_admin_review on public.whatsapp_solicitudes for update to authenticated
using (exists (select 1 from public.usuarios u where u.id = (select auth.uid()) and u.activo and u.rol = 'admin'))
with check (exists (select 1 from public.usuarios u where u.id = (select auth.uid()) and u.activo and u.rol = 'admin'));

-- Atomic leases prevent parallel workers or n8n retries processing the same row.
create function public.claim_whatsapp_solicitud() returns setof public.whatsapp_solicitudes
language sql security invoker set search_path = '' as $$
  update public.whatsapp_solicitudes s set procesamiento = 'procesando', lease_at = now(), lease_id = gen_random_uuid()
  where s.id = (select q.id from public.whatsapp_solicitudes q
    where q.procesamiento = 'recibido' or (q.procesamiento = 'procesando' and q.lease_at < now() - interval '3 minutes')
    order by q.created_at for update skip locked limit 1)
  returning s.*;
$$;
revoke all on function public.claim_whatsapp_solicitud() from public, anon, authenticated;
grant execute on function public.claim_whatsapp_solicitud() to service_role;

create function public.claim_whatsapp_aviso() returns setof public.whatsapp_solicitudes
language plpgsql security invoker set search_path = '' as $$
begin
  -- Stale sends may have reached Meta. Surface for human review, never duplicate.
  update public.whatsapp_solicitudes set aviso_estado = 'revisar_error'
  where aviso_estado = 'enviando' and aviso_at < now() - interval '3 minutes';
  return query update public.whatsapp_solicitudes s set aviso_estado = 'enviando', aviso_at = now()
  where s.id = (select q.id from public.whatsapp_solicitudes q
    where q.aviso_estado = 'pendiente' order by q.created_at for update skip locked limit 1)
  returning s.*;
end;
$$;
revoke all on function public.claim_whatsapp_aviso() from public, anon, authenticated;
grant execute on function public.claim_whatsapp_aviso() to service_role;
