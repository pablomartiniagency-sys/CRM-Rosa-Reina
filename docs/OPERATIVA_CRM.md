# Operativa CRM Rosa Reina

Esta guia responde a dos preguntas: que toca hacer ahora y como saber si el CRM esta listo para trabajar o hacer demos.

## Comandos diarios

Ver estado operativo:

```bash
npm run crm:status
```

Rellenar demo media:

```bash
npm run demo:seed:medium
```

Rellenar un volumen concreto:

```bash
npm run demo:seed -- --count=50
```

Borrar demo activa:

```bash
npm run demo:clean
```

Auditoria critica de RAG/WhatsApp/importaciones:

```bash
npm run audit:critical
```

## Que mirar en `crm:status`

- `crm_visible`: hay datos CRM suficientes para cargar vistas.
- `demo_ready`: hay datos fake activos para pruebas.
- `rag_safe`: RAG publico tiene contenido y no recupera sensibles ni huerfanos.
- `whatsapp_evidence`: hay inbound/outbound WhatsApp vinculados a cliente/contacto.
- `email_simulation_ready`: hay emails de ejemplo guardados con revision administrativa.
- `imports_ready`: importaciones criticas tienen staging, aplicacion final y vault privado.
- `platform_vault_ready`: Supabase `zbec...` esta configurado para credenciales, accesos e identidad interna.
- `identity_ready`: login real configurado con variables `NEXT_PUBLIC_IDENTITY_SUPABASE_*`.

## Siguiente orden recomendado

1. Mantener demo media cargada para validar pantallas y conversaciones internas.
2. Conectar plataforma/vault `zbec...` con `PLATFORM_SUPABASE_*` sin tocar `SUPABASE_*`.
3. Conectar identidad/accesos reales de Rosa Reina.
4. Auditar y cerrar flujo email n8n: lectura, resumen IA, guardado en `actividades`, adjuntos y aviso de revision.
5. Crear asistente interno privilegiado solo para usuarios autenticados.
6. Rotar credenciales al final, antes de produccion.

## Notas de seguridad

No se ha creado ningun endpoint web para seed/clean porque seria destructivo y requeriria `service_role`. Por ahora esos comandos se ejecutan solo desde CLI local/servidor.

WhatsApp cliente debe seguir limitado a RAG publico, contexto propio y `bot_safe`; la informacion privada completa debe quedar solo para CRM interno autenticado.

La separacion completa de variables esta documentada en `docs/SEGURIDAD_PLATAFORMA_CREDENCIALES.md`.
