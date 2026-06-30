# Validacion RAG + WhatsApp - 2026-06-30

## Estado validado

- n8n RAG loader: `W86DZM3VpnIwuIJU`, activo.
- n8n WhatsApp: `MrB7ole5rzayU3MI`, activo.
- Supabase project: `fgqlgehbtjdwcilyroiq`.
- Drive RAG folder: `10t2DMGO3T0fR3WuNFOk7SyYwl9udaWtH`.

## RAG publico

Se subio `FAQ_Publica_Rosa_Reina.csv` a la carpeta RAG de Drive. El trigger de n8n lo proceso correctamente en la ejecucion `698` y movio el archivo a Procesados.

Auditoria posterior en Supabase:

- Documentos activos: `2`.
- Chunks publicos: `10`.
- Chunks sensibles recuperables: `0`.
- Chunks huerfanos: `0`.
- Chunks privados `bot_safe`: `0`.
- Embeddings: `1536` dimensiones en todos los chunks activos.

Documentos activos:

- `FAQ_Publica_Rosa_Reina.csv`: tipo `faq`, `4` chunks.
- `Catalogo_Productos_Servicios_RosaReina.pdf`: tipo `catalogo`, `6` chunks.

## Supabase

Se anadio `public.match_documents_whatsapp(...)` como alias limpio para el RAG publico de WhatsApp. Filtra solo:

- `catalogo`
- `faq`
- `publicidad`

Se mantiene `public.match_documents_telegram(...)` por compatibilidad, pero el workflow WhatsApp ya apunta a `match_documents_whatsapp`.

RPC privadas verificadas:

- `match_bot_safe_knowledge`: `anon=false`, `authenticated=false`, `service_role=true`.
- `rag_security_audit`: `anon=false`, `authenticated=false`, `service_role=true`.

## WhatsApp

El workflow WhatsApp se actualizo para:

- Usar `match_documents_whatsapp`.
- Reforzar el system prompt con separacion de fuentes permitidas/prohibidas.
- Forzar derivacion determinista en `Preparar Respuesta` cuando el mensaje o la salida del modelo incluyan precios, tarifas, presupuestos, pedidos, cantidades de cotizacion, plazos, contratos o condiciones comerciales.
- Mantener una respuesta limpia para cliente y una respuesta marcada interna con `[DERIVAR]`.

Prueba local del nodo `Preparar Respuesta`:

- `Cuanto cuestan 50 babis?` -> `derivar=true`.
- `Que tipos de babis teneis?` -> `derivar=false`.
- Salida del modelo con precio/cifra -> `derivar=true`.

## Riesgos pendientes

- La clave de API de n8n fue pegada en chat y debe rotarse antes de produccion.
- La carpeta RAG de Drive aun contiene PDFs de pedidos/tarifas. El loader los bloquea, pero deberian moverse a un vault privado para evitar ruido operativo.
- La app local sigue necesitando `.env.local` con claves reales para que el CRM consuma Supabase/OpenAI/WhatsApp desde Next.js.
