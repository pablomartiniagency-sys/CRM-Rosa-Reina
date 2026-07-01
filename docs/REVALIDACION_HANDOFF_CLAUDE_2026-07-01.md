# Revalidacion handoff Claude - 2026-07-01

## Fuente

Archivo revisado: `C:/Users/wars3/Downloads/PROMPT_CODEX_continuidad_2026-07-01.md`.

La informacion del handoff se trato como pista y se cruzo contra n8n/Supabase en vivo.

## WhatsApp

Workflow: `MrB7ole5rzayU3MI`.

Estado verificado:

- Workflow activo.
- `RAG Catalogo` tiene credencial Supabase vinculada.
- `RAG Catalogo` usa tabla `documento_chunks`.
- `RAG Catalogo` usa RPC `match_documents_whatsapp`.
- `Embeddings OpenAI` tiene credencial OpenAI vinculada.
- `OpenAI Chat Model` esta en `gpt-4.1-mini`.
- `Imagen Analizar` esta en `gpt-4.1-mini`.
- `Aviso Administraci?n` tiene `resource="message"` y `operation="send"`.
- `Enviar WhatsApp` usa `phoneNumberId=1165280200004237`.
- `Guardar Entrada` sigue antes de `AI Agent`.
- `Guardar Interacci?n` guarda outbound.

Ejecuciones reales relevantes:

- `717`: success, camino completo con `RAG Catalogo`, `Embeddings OpenAI`, `AI Agent`, `Enviar WhatsApp` y `Guardar Interacci?n`.
- `721`: success, camino completo con `AI Agent`, `?Derivar?`, `Aviso Administraci?n`, `Enviar WhatsApp` y `Guardar Interacci?n`.
- `722`, `723`, `724`: success, pero solo pasaron por `WhatsApp Trigger` y `Extraer Mensaje`; son eventos parciales, no conversaciones completas.

Supabase despues de las pruebas:

- WhatsApp total: 42 actividades.
- Inbound: 35.
- Outbound: 7.
- Vinculadas a contacto/cuenta: 0.

Interpretacion:

- WhatsApp end-to-end general ya tiene evidencia real de entrada, RAG, respuesta y guardado outbound.
- La derivacion comercial tiene evidencia real de camino n8n con `Aviso Administraci?n`.
- La personalizacion por telefono sigue sin cerrar porque el telefono probado no existe en `contacto_metodos`; hay que repetir desde un telefono dado de alta en CRM.

## Email

Workflow: `c9ec562enurcX8Ms`.

Estado verificado:

- Workflow activo.
- La query de `Identificar Cliente` ahora usa un subselect escalar:
  `SELECT (SELECT ... LIMIT 1) AS trade_name`.
- El prompt de `Message a model` ya no contiene referencias a `$('Identificar Cliente').first()`.
- Sigue pendiente migrar los headers hardcodeados de Supabase en:
  - `RAG — Contexto Pedido1`
  - `RAG — Contexto Consulta1`

## Pendiente critico real

1. Probar WhatsApp desde un telefono que exista en CRM.
2. Confirmar que las nuevas actividades inbound/outbound quedan con `contacto_id` o `cuenta_id`.
3. Rotar credenciales antes de produccion.
4. Migrar los headers Supabase hardcodeados del workflow de email a credenciales n8n.
