# CRM Rosa Reina

CRM interno para Rosa Reina, adaptado desde la base tecnica de Nido pero recortado al dominio real: clientes/colegios, contactos, oportunidades, pedidos, WhatsApp, RAG seguro e importaciones criticas con staging.

## Arquitectura

- Next.js 16 + React 19 para la app interna.
- Supabase `fgqlgehbtjdwcilyroiq` como data plane.
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

## Comandos

```bash
npm install
npm run type-check
npm run lint
npm run build
npm run dev
```

Login local de desarrollo: `admin@test.com` / `admin`.

## Supabase

La migracion aplicada crea:

- `private.knowledge_documents`
- `private.knowledge_chunks`
- `private.critical_import_batches`
- `private.critical_import_rows`
- `public.match_bot_safe_knowledge`
- `public.rag_security_audit`

Verificacion actual tras aplicar:

- `live_documents`: 1
- `public_chunks`: 6
- `sensitive_recoverable_chunks`: 0
- `orphan_chunks`: 0
- `private_bot_safe_chunks`: 0
