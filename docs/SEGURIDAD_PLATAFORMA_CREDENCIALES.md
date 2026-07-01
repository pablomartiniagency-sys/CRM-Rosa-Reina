# Seguridad plataforma y credenciales

Este proyecto usa dos bases Supabase distintas por diseno. No deben mezclarse salvo migracion consciente.

## Planos

- CRM data plane: `fgqlgehbtjdwcilyroiq`. Guarda cuentas, contactos, actividades, pedidos, RAG, WhatsApp e importaciones del CRM Rosa Reina.
- Plataforma/vault: `zbecidvekwtgnxfxdqhq`. Guarda credenciales, accesos, permisos entre CRMs e identidad interna.

## Variables correctas

CRM data plane:

```bash
SUPABASE_URL=https://fgqlgehbtjdwcilyroiq.supabase.co
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
SUPABASE_JWKS_URL=https://fgqlgehbtjdwcilyroiq.supabase.co/auth/v1/.well-known/jwks.json
```

Plataforma/vault:

```bash
PLATFORM_SUPABASE_URL=https://zbecidvekwtgnxfxdqhq.supabase.co
PLATFORM_SUPABASE_PUBLISHABLE_KEY=...
PLATFORM_SUPABASE_SECRET_KEY=...
PLATFORM_SUPABASE_JWKS_URL=https://zbecidvekwtgnxfxdqhq.supabase.co/auth/v1/.well-known/jwks.json
```

Identidad para login real:

```bash
NEXT_PUBLIC_IDENTITY_SUPABASE_URL=https://zbecidvekwtgnxfxdqhq.supabase.co
NEXT_PUBLIC_IDENTITY_SUPABASE_PUBLISHABLE_KEY=...
IDENTITY_SUPABASE_SERVICE_ROLE_KEY=...
```

## Reglas

- No poner nunca una clave `secret` o `service_role` en variables `NEXT_PUBLIC_*`.
- No guardar claves reales en Git, README, docs, tickets ni capturas.
- No usar `SUPABASE_URL` para el vault; esa variable alimenta las vistas del CRM.
- Si `npm run crm:status` avisa que `SUPABASE_URL` apunta a `zbec`, detener pruebas y corregir `.env.local`.
- WhatsApp productivo sigue en n8n; el CRM solo muestra estado y evidencias guardadas en la base operativa.
- Antes de produccion, rotar todas las claves que se hayan pegado en chat o herramientas.

## Verificacion

```bash
npm run crm:status
npm run audit:critical
npm run type-check
npm run lint
npm run build
```

Estado esperado para una plataforma segura:

- `crm_visible=true`: la app lee el data plane operativo.
- `platform_vault_ready=true`: el vault/accesos esta configurado por variables server-only.
- `identity_ready=true`: el login real tiene URL y publishable key de identidad.
- `rag_safe=true`: el RAG publico no recupera chunks sensibles ni huerfanos.
- `whatsapp_evidence=true`: hay mensajes inbound/outbound vinculados a contacto/cuenta.

## Nota Supabase

Supabase esta endureciendo la exposicion automatica de tablas nuevas a la Data API. En nuevos desarrollos, tratar `GRANT`, RLS y exposicion API como decisiones explicitas, especialmente para tablas de credenciales, vault, RAG privado y datos comerciales.
