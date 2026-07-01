# CRM Rosa Reina

CRM interno para Rosa Reina, adaptado desde la base tecnica de Nido pero recortado al dominio real: clientes/colegios, contactos, oportunidades, pedidos, WhatsApp, RAG seguro e importaciones criticas con staging.

## Arquitectura

- Next.js 16 + React 19 para la app interna.
- Supabase `fgqlgehbtjdwcilyroiq` como data plane administrativo, el mismo proyecto usado por la base Nido.
- Supabase `zbecidvekwtgnxfxdqhq` como plataforma/vault para credenciales, accesos e identidad interna.
- El backend del CRM lee datos privilegiados con `SUPABASE_SECRET_KEY` o `SUPABASE_SERVICE_ROLE_KEY`; esa clave va solo en servidor y nunca en el navegador.
- n8n como automatizacion externa para WhatsApp y loader RAG.
- RAG publico en `public.documentos` / `public.documento_chunks`.
- Vault privado en schema `private`, con RPC `match_bot_safe_knowledge` limitada a `service_role`.

## Reglas de seguridad

- El asistente nunca comunica precios, tarifas, descuentos, presupuestos, pedidos, cantidades para cotizar ni plazos comprometidos.
- Cualquier intento de ese tipo debe empezar con `[DERIVAR]` y pasar a administracion.
- WhatsApp solo puede usar RAG publico, contexto CRM del propio contacto y conocimiento privado marcado como `bot_safe`.
- Tarifas, contratos, condiciones especiales y pedidos viven en tablas privadas, no en RAG publico.

## Variables

Copia `.env.example` a `.env.local` y rellena las claves reales. No guardes tokens reales en Git.

Supabase queda separado en dos planos:

- CRM/RAG/WhatsApp data plane: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`.
- Plataforma/vault de credenciales y accesos: `PLATFORM_SUPABASE_URL`, `PLATFORM_SUPABASE_PUBLISHABLE_KEY`, `PLATFORM_SUPABASE_SECRET_KEY`, `PLATFORM_SUPABASE_JWKS_URL`.
- Login real en navegador: `NEXT_PUBLIC_IDENTITY_SUPABASE_URL`, `NEXT_PUBLIC_IDENTITY_SUPABASE_PUBLISHABLE_KEY` o `NEXT_PUBLIC_IDENTITY_SUPABASE_ANON_KEY`.
- Compatibles legacy/publicas para el CRM: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

`SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PLATFORM_SUPABASE_SECRET_KEY` e `IDENTITY_SUPABASE_SERVICE_ROLE_KEY` son solo de servidor. Nunca deben llevar prefijo `NEXT_PUBLIC_`.

Guia de seguridad de plataforma en `docs/SEGURIDAD_PLATAFORMA_CREDENCIALES.md`.

## Comandos

```bash
npm install
npm run type-check
npm run lint
npm run build
npm run crm:status
npm run dev
```

Login local de desarrollo: `admin@test.com` / `admin`.

## Datos demo

Para rellenar el CRM con datos ficticios y reversibles:

```bash
npm run demo:seed
npm run demo:seed:medium
npm run demo:seed:large
npm run demo:seed -- --count=50
```

Para borrar solo esos datos demo:

```bash
npm run demo:clean
npm run demo:status
```

Los registros demo se marcan con `demo_seed_id = rosa-reina-demo-v1`. Guia completa en `docs/DATOS_DEMO_CRM.md`.

Estado operativo y siguientes pasos en `docs/OPERATIVA_CRM.md`.

## Supabase

La migracion aplicada crea:

- `private.knowledge_documents`
- `private.knowledge_chunks`
- `private.critical_import_batches`
- `private.critical_import_rows`
- `public.match_bot_safe_knowledge`
- `public.rag_security_audit`

Verificacion actual tras aplicar:

- `live_documents`: 2
- `public_chunks`: 10
- `sensitive_recoverable_chunks`: 0
- `orphan_chunks`: 0
- `private_bot_safe_chunks`: 0
