create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to service_role;

create table if not exists private.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text,
  scope text not null default 'internal'
    check (scope in ('internal', 'bot_safe')),
  audience text not null default 'admin'
    check (audience in ('admin', 'team', 'bot')),
  sensitivity text not null default 'internal'
    check (sensitivity in ('public', 'internal', 'confidential', 'restricted')),
  approved_by text,
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists private.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references private.knowledge_documents(id) on delete cascade,
  chunk_index integer not null default 0,
  content text not null,
  embedding vector(1536),
  bot_safe boolean not null default false,
  sensitive boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_private_knowledge_chunks_embedding
  on private.knowledge_chunks using hnsw (embedding vector_cosine_ops);

create index if not exists idx_private_knowledge_chunks_bot_safe
  on private.knowledge_chunks (bot_safe, sensitive);

create index if not exists idx_private_knowledge_chunks_document_id
  on private.knowledge_chunks (document_id);

create table if not exists private.critical_import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_type text,
  source text not null default 'crm_upload'
    check (source in ('crm_upload', 'drive_private', 'manual')),
  status text not null default 'staged'
    check (status in ('staged', 'approved', 'rejected', 'applied')),
  uploaded_by text,
  approved_by text,
  row_count integer not null default 0,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists private.critical_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references private.critical_import_batches(id) on delete cascade,
  row_number integer not null,
  raw jsonb not null default '{}'::jsonb,
  mapped jsonb not null default '{}'::jsonb,
  sensitivity text not null
    check (sensitivity in ('low', 'medium', 'high')),
  confidence numeric not null default 0,
  destination text not null
    check (destination in ('pedidos', 'pedido_lineas', 'tarifas_privadas', 'condiciones', 'documentos_privados')),
  issues text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_private_critical_import_rows_batch_id
  on private.critical_import_rows (batch_id);

alter table private.knowledge_documents enable row level security;
alter table private.knowledge_chunks enable row level security;
alter table private.critical_import_batches enable row level security;
alter table private.critical_import_rows enable row level security;

grant all privileges on all tables in schema private to service_role;
grant all privileges on all sequences in schema private to service_role;
alter default privileges in schema private grant all privileges on tables to service_role;
alter default privileges in schema private grant all privileges on sequences to service_role;

create or replace function public.match_bot_safe_knowledge(
  query_embedding vector(1536),
  match_count integer default 5,
  match_threshold double precision default 0.45
)
returns table (
  chunk_id uuid,
  document_id uuid,
  title text,
  content text,
  similarity double precision,
  metadata jsonb
)
language sql
security definer
set search_path = private, public, pg_temp
as $$
  select
    c.id as chunk_id,
    d.id as document_id,
    d.title,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity,
    c.metadata || jsonb_build_object('scope', d.scope, 'audience', d.audience, 'sensitivity', d.sensitivity) as metadata
  from private.knowledge_chunks c
  join private.knowledge_documents d on d.id = c.document_id
  where d.archived_at is null
    and d.scope = 'bot_safe'
    and d.audience = 'bot'
    and d.approved_at is not null
    and c.bot_safe = true
    and c.sensitive = false
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.rag_security_audit()
returns table (
  live_documents bigint,
  public_chunks bigint,
  sensitive_recoverable_chunks bigint,
  orphan_chunks bigint,
  private_bot_safe_chunks bigint
)
language sql
security definer
set search_path = public, private, pg_temp
as $$
  select
    (select count(*) from public.documentos d where d.deleted_at is null) as live_documents,
    (select count(*)
       from public.documento_chunks c
       join public.documentos d on d.documento_id = c.documento_id
      where d.deleted_at is null
        and c.tipo in ('catalogo', 'faq', 'publicidad')) as public_chunks,
    (select count(*)
       from public.documento_chunks c
       join public.documentos d on d.documento_id = c.documento_id
      where d.deleted_at is null
        and c.tipo in ('catalogo', 'faq', 'publicidad')
        and (
          c.contenido ~ '(\d{1,4}[.,]\d{2}\s*EUR)|(EUR\s*\d)|(\d+\s*EUR)|(\d{1,4}[.,]\d{2}\s*€)|(€\s*\d)|(\d+\s*€)'
          or c.contenido ~* '(^|\n)\s*(de|para|asunto|fecha|from|to|subject|cc)\s*:'
        )) as sensitive_recoverable_chunks,
    (select count(*)
       from public.documento_chunks c
      where not exists (
        select 1
        from public.documentos d
        where d.documento_id = c.documento_id
          and d.deleted_at is null
      )) as orphan_chunks,
    (select count(*)
       from private.knowledge_chunks c
       join private.knowledge_documents d on d.id = c.document_id
      where d.archived_at is null
        and d.scope = 'bot_safe'
        and d.audience = 'bot'
        and d.approved_at is not null
        and c.bot_safe = true
        and c.sensitive = false) as private_bot_safe_chunks;
$$;

revoke all on function public.match_bot_safe_knowledge(vector(1536), integer, double precision) from public;
revoke all on function public.match_bot_safe_knowledge(vector(1536), integer, double precision) from anon;
revoke all on function public.match_bot_safe_knowledge(vector(1536), integer, double precision) from authenticated;
grant execute on function public.match_bot_safe_knowledge(vector(1536), integer, double precision) to service_role;

revoke all on function public.rag_security_audit() from public;
revoke all on function public.rag_security_audit() from anon;
revoke all on function public.rag_security_audit() from authenticated;
grant execute on function public.rag_security_audit() to service_role;

notify pgrst, 'reload schema';
