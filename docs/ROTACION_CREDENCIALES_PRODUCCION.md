# Rotacion de credenciales antes de produccion

## Motivo

Varias credenciales reales se compartieron durante la preparacion del proyecto. Sirven para pruebas controladas, pero no deben quedar vivas antes de un despliegue serio.

## Orden recomendado

1. Crear credenciales nuevas.
2. Actualizar n8n, variables del CRM local y variables del hosting.
3. Ejecutar pruebas de salud, RAG y WhatsApp.
4. Revocar las credenciales antiguas.
5. Confirmar que ninguna clave aparece en commits, capturas, chats, logs o documentos.

## OpenAI

- Crear una nueva API key en el proyecto correcto.
- Actualizar `OPENAI_API_KEY` en `.env.local`, hosting y credenciales de n8n que llamen al modelo.
- Ejecutar una prueba de asistente/RAG.
- Revocar la clave antigua.

Referencia oficial: https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety

## Supabase

- Mantener `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para cliente publico.
- Rotar la clave admin/secret usada por backend: `SUPABASE_SERVICE_ROLE_KEY` o `SUPABASE_SECRET_KEY`, segun entorno.
- Actualizar `.env.local`, hosting y credenciales Postgres/Supabase en n8n.
- Ejecutar `/api/health`, `/api/crm/overview` y `npm run audit:critical`.
- Revocar la clave antigua.

Si se rotan claves JWT legacy, planificar ventana de compatibilidad y revocar la clave previa despues de validar sesiones y servicios.

Referencias oficiales:
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/troubleshooting/rotating-anon-service-and-jwt-secrets-1Jq6yd

## Meta WhatsApp

- Generar un token nuevo para el usuario/sistema productivo en Meta Business.
- Confirmar que pertenece al mismo WhatsApp Business Account y al mismo Phone Number ID productivo.
- Actualizar la credencial de WhatsApp en n8n.
- Enviar mensajes de prueba: consulta publica, consulta personalizada, precio/derivacion e intento de prompt injection.
- Revocar o dejar expirar el token anterior.

Referencia oficial: https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started

## n8n

- Crear una API key nueva en `Settings > n8n API`.
- Usarla solo para auditorias y tareas administrativas.
- Actualizar cualquier entorno local que ejecute `npm run audit:critical`.
- Borrar la API key anterior desde n8n.

Referencia oficial: https://docs.n8n.io/connect/n8n-api/authentication/

## Gate de salida

Antes de produccion debe cumplirse:

- `npm run type-check`
- `npm run lint`
- `npm run build`
- `npm run audit:critical` con la API key nueva de n8n
- Prueba fisica de WhatsApp con ejecucion n8n en `success`
- Supabase mantiene RAG con `0` sensibles recuperables y `0` huerfanos
- No queda ninguna credencial antigua activa
