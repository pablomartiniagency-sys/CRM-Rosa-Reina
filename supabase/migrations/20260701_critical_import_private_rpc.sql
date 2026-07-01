create or replace function public.critical_import_create_batch(
  p_file_name text,
  p_file_type text,
  p_uploaded_by text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_batch private.critical_import_batches%rowtype;
  v_row jsonb;
begin
  insert into private.critical_import_batches (
    file_name,
    file_type,
    source,
    status,
    uploaded_by,
    row_count
  )
  values (
    p_file_name,
    p_file_type,
    'crm_upload',
    'staged',
    p_uploaded_by,
    coalesce(jsonb_array_length(coalesce(p_rows, '[]'::jsonb)), 0)
  )
  returning * into v_batch;

  for v_row in select value from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  loop
    insert into private.critical_import_rows (
      batch_id,
      row_number,
      raw,
      mapped,
      sensitivity,
      confidence,
      destination,
      issues
    )
    values (
      v_batch.id,
      coalesce((v_row->>'row_number')::integer, 0),
      coalesce(v_row->'raw', '{}'::jsonb),
      coalesce(v_row->'mapped', '{}'::jsonb),
      coalesce(v_row->>'sensitivity', 'low'),
      coalesce((v_row->>'confidence')::numeric, 0),
      coalesce(v_row->>'destination', 'documentos_privados'),
      array(select jsonb_array_elements_text(coalesce(v_row->'issues', '[]'::jsonb)))
    );
  end loop;

  return to_jsonb(v_batch);
end;
$$;

create or replace function public.critical_import_review_batch(
  p_batch_id uuid,
  p_action text,
  p_reviewed_by text
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_batch private.critical_import_batches%rowtype;
  v_status text;
begin
  if p_action not in ('approve', 'reject') then
    raise exception 'Action must be approve or reject';
  end if;

  v_status := case when p_action = 'approve' then 'approved' else 'rejected' end;

  update private.critical_import_batches
     set status = v_status,
         approved_by = coalesce(p_reviewed_by, 'crm'),
         approved_at = now()
   where id = p_batch_id
     and status = 'staged'
  returning * into v_batch;

  if v_batch.id is null then
    raise exception 'Staged batch not found';
  end if;

  return to_jsonb(v_batch);
end;
$$;

create or replace function public.critical_import_get_batch(p_batch_id uuid)
returns jsonb
language sql
security definer
set search_path = private, public, pg_temp
as $$
  select to_jsonb(b)
  from private.critical_import_batches b
  where b.id = p_batch_id;
$$;

create or replace function public.critical_import_get_rows(p_batch_id uuid)
returns jsonb
language sql
security definer
set search_path = private, public, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.row_number), '[]'::jsonb)
  from private.critical_import_rows r
  where r.batch_id = p_batch_id;
$$;

create or replace function public.critical_import_update_row_status(
  p_row_id uuid,
  p_apply_status text,
  p_applied_to text,
  p_applied_record_id text,
  p_applied_at timestamptz,
  p_apply_error text
)
returns void
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
begin
  if p_apply_status not in ('applied', 'skipped', 'failed') then
    raise exception 'Invalid apply status';
  end if;

  update private.critical_import_rows
     set apply_status = p_apply_status,
         applied_to = p_applied_to,
         applied_record_id = p_applied_record_id,
         applied_at = p_applied_at,
         apply_error = p_apply_error
   where id = p_row_id;
end;
$$;

create or replace function public.critical_import_mark_batch_applied(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_batch private.critical_import_batches%rowtype;
begin
  update private.critical_import_batches
     set status = 'applied'
   where id = p_batch_id
     and status = 'approved'
  returning * into v_batch;

  if v_batch.id is null then
    raise exception 'Approved batch not found';
  end if;

  return to_jsonb(v_batch);
end;
$$;

create or replace function public.critical_import_insert_private_vault(
  p_destination text,
  p_payload jsonb
)
returns text
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_destination = 'tarifas_privadas' then
    insert into private.tarifas_privadas (
      batch_id,
      row_id,
      cuenta_id,
      contacto_id,
      concepto,
      importe,
      moneda,
      raw,
      mapped,
      sensitivity,
      created_by
    )
    values (
      (p_payload->>'batch_id')::uuid,
      (p_payload->>'row_id')::uuid,
      nullif(p_payload->>'cuenta_id', '')::uuid,
      nullif(p_payload->>'contacto_id', '')::uuid,
      coalesce(p_payload->>'concepto', 'Tarifa importada'),
      nullif(p_payload->>'importe', '')::numeric,
      coalesce(p_payload->>'moneda', 'EUR'),
      coalesce(p_payload->'raw', '{}'::jsonb),
      coalesce(p_payload->'mapped', '{}'::jsonb),
      coalesce(p_payload->>'sensitivity', 'high'),
      p_payload->>'created_by'
    )
    returning id into v_id;
  elsif p_destination = 'condiciones' then
    insert into private.condiciones (
      batch_id,
      row_id,
      cuenta_id,
      contacto_id,
      tipo,
      resumen,
      raw,
      mapped,
      sensitivity,
      created_by
    )
    values (
      (p_payload->>'batch_id')::uuid,
      (p_payload->>'row_id')::uuid,
      nullif(p_payload->>'cuenta_id', '')::uuid,
      nullif(p_payload->>'contacto_id', '')::uuid,
      coalesce(p_payload->>'tipo', 'condicion_comercial'),
      coalesce(p_payload->>'resumen', 'Condicion importada'),
      coalesce(p_payload->'raw', '{}'::jsonb),
      coalesce(p_payload->'mapped', '{}'::jsonb),
      coalesce(p_payload->>'sensitivity', 'high'),
      p_payload->>'created_by'
    )
    returning id into v_id;
  elsif p_destination = 'documentos_privados' then
    insert into private.documentos_privados (
      batch_id,
      row_id,
      titulo,
      fuente,
      raw,
      mapped,
      sensitivity,
      created_by
    )
    values (
      (p_payload->>'batch_id')::uuid,
      (p_payload->>'row_id')::uuid,
      coalesce(p_payload->>'titulo', 'Documento privado importado'),
      p_payload->>'fuente',
      coalesce(p_payload->'raw', '{}'::jsonb),
      coalesce(p_payload->'mapped', '{}'::jsonb),
      coalesce(p_payload->>'sensitivity', 'medium'),
      p_payload->>'created_by'
    )
    returning id into v_id;
  else
    raise exception 'Unsupported private destination %', p_destination;
  end if;

  return v_id::text;
end;
$$;

create or replace function public.critical_import_private_audit()
returns table (
  row_application_columns boolean,
  tarifas_privadas_count bigint,
  condiciones_count bigint,
  documentos_privados_count bigint
)
language sql
security definer
set search_path = private, public, pg_temp
as $$
  select
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'private'
        and table_name = 'critical_import_rows'
        and column_name = 'apply_status'
    ) as row_application_columns,
    (select count(*) from private.tarifas_privadas) as tarifas_privadas_count,
    (select count(*) from private.condiciones) as condiciones_count,
    (select count(*) from private.documentos_privados) as documentos_privados_count;
$$;

revoke all on function public.critical_import_create_batch(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.critical_import_review_batch(uuid, text, text) from public, anon, authenticated;
revoke all on function public.critical_import_get_batch(uuid) from public, anon, authenticated;
revoke all on function public.critical_import_get_rows(uuid) from public, anon, authenticated;
revoke all on function public.critical_import_update_row_status(uuid, text, text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.critical_import_mark_batch_applied(uuid) from public, anon, authenticated;
revoke all on function public.critical_import_insert_private_vault(text, jsonb) from public, anon, authenticated;
revoke all on function public.critical_import_private_audit() from public, anon, authenticated;

grant execute on function public.critical_import_create_batch(text, text, text, jsonb) to service_role;
grant execute on function public.critical_import_review_batch(uuid, text, text) to service_role;
grant execute on function public.critical_import_get_batch(uuid) to service_role;
grant execute on function public.critical_import_get_rows(uuid) to service_role;
grant execute on function public.critical_import_update_row_status(uuid, text, text, text, timestamptz, text) to service_role;
grant execute on function public.critical_import_mark_batch_applied(uuid) to service_role;
grant execute on function public.critical_import_insert_private_vault(text, jsonb) to service_role;
grant execute on function public.critical_import_private_audit() to service_role;

notify pgrst, 'reload schema';
