-- Platform/vault project: zbecidvekwtgnxfxdqhq
-- Restrict audit log inserts to platform operators. Server/service-role clients
-- still bypass RLS for backend audit writes.

drop policy if exists audit_server_insert on public.audit_logs;
drop policy if exists audit_operator_insert on public.audit_logs;

create policy audit_operator_insert
  on public.audit_logs
  for insert
  to authenticated
  with check (public.cp_is_operator());
