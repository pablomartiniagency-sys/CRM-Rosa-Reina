create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to service_role;

alter table private.critical_import_rows
  add column if not exists apply_status text not null default 'pending'
    check (apply_status in ('pending', 'applied', 'skipped', 'failed')),
  add column if not exists applied_to text,
  add column if not exists applied_record_id text,
  add column if not exists applied_at timestamptz,
  add column if not exists apply_error text;

create table if not exists private.tarifas_privadas (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references private.critical_import_batches(id) on delete restrict,
  row_id uuid not null references private.critical_import_rows(id) on delete restrict,
  cuenta_id uuid references public.cuentas(id) on delete set null,
  contacto_id uuid references public.contactos(id) on delete set null,
  concepto text not null,
  importe numeric,
  moneda text not null default 'EUR',
  raw jsonb not null default '{}'::jsonb,
  mapped jsonb not null default '{}'::jsonb,
  sensitivity text not null default 'high'
    check (sensitivity in ('low', 'medium', 'high')),
  created_by text,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (row_id)
);

create table if not exists private.condiciones (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references private.critical_import_batches(id) on delete restrict,
  row_id uuid not null references private.critical_import_rows(id) on delete restrict,
  cuenta_id uuid references public.cuentas(id) on delete set null,
  contacto_id uuid references public.contactos(id) on delete set null,
  tipo text not null default 'condicion_comercial',
  resumen text not null,
  raw jsonb not null default '{}'::jsonb,
  mapped jsonb not null default '{}'::jsonb,
  sensitivity text not null default 'high'
    check (sensitivity in ('low', 'medium', 'high')),
  created_by text,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (row_id)
);

create table if not exists private.documentos_privados (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references private.critical_import_batches(id) on delete restrict,
  row_id uuid not null references private.critical_import_rows(id) on delete restrict,
  titulo text not null,
  fuente text,
  raw jsonb not null default '{}'::jsonb,
  mapped jsonb not null default '{}'::jsonb,
  sensitivity text not null default 'medium'
    check (sensitivity in ('low', 'medium', 'high')),
  created_by text,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (row_id)
);

create index if not exists idx_private_tarifas_privadas_batch_id
  on private.tarifas_privadas (batch_id);

create index if not exists idx_private_condiciones_batch_id
  on private.condiciones (batch_id);

create index if not exists idx_private_documentos_privados_batch_id
  on private.documentos_privados (batch_id);

alter table private.tarifas_privadas enable row level security;
alter table private.condiciones enable row level security;
alter table private.documentos_privados enable row level security;

revoke all on private.tarifas_privadas from public, anon, authenticated;
revoke all on private.condiciones from public, anon, authenticated;
revoke all on private.documentos_privados from public, anon, authenticated;

grant select, insert, update, delete on private.tarifas_privadas to service_role;
grant select, insert, update, delete on private.condiciones to service_role;
grant select, insert, update, delete on private.documentos_privados to service_role;

notify pgrst, 'reload schema';
