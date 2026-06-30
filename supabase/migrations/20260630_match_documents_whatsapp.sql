create or replace function public.match_documents_whatsapp(
  query_embedding vector,
  match_count integer default 5,
  filter jsonb default '{}'::jsonb
)
returns table (
  id text,
  content text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.chunk_id as id,
    c.contenido as content,
    jsonb_build_object('titulo', d.titulo, 'tipo', c.tipo) || coalesce(c.metadata, '{}'::jsonb) as metadata,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.documento_chunks c
  join public.documentos d on d.documento_id = c.documento_id
  where c.embedding is not null
    and d.deleted_at is null
    and c.tipo in ('catalogo', 'faq', 'publicidad')
  order by c.embedding <=> query_embedding
  limit least(match_count, 20);
$$;

grant execute on function public.match_documents_whatsapp(vector, integer, jsonb) to anon, authenticated, service_role;

comment on function public.match_documents_whatsapp(vector, integer, jsonb)
  is 'Public WhatsApp RAG retrieval. Returns only customer-safe catalog, FAQ and publicity chunks.';
