# Datos demo CRM Rosa Reina

Este bloque sirve para rellenar el CRM con datos ficticios y poder probar la experiencia completa sin tocar datos reales.

## Comandos

Crear o recrear datos demo:

```bash
npm run demo:seed
```

Borrar solo los datos demo:

```bash
npm run demo:clean
```

Reset completo de datos demo:

```bash
npm run demo:reset
```

Ver cuantos datos demo activos hay:

```bash
npm run demo:status
```

Crear una demo pequena, media o grande:

```bash
npm run demo:seed:small
npm run demo:seed:medium
npm run demo:seed:large
```

Crear un volumen exacto:

```bash
npm run demo:seed -- --count=50
```

Por seguridad el script limita el volumen a 250 cuentas demo por ejecucion.

## Que crea

- Cuentas/colegios demo con prefijo `[DEMO]`.
- Contactos principales con telefono, email y canal preferido WhatsApp.
- Metodos de contacto para probar identificacion por telefono.
- Leads de email y WhatsApp.
- Pedidos y lineas de pedido para aproximadamente el 65% de las cuentas demo.
- Actividades inbound/outbound de WhatsApp.
- Actividades de email con revision administrativa y adjuntos ficticios.

## Seguridad

Todos los registros compatibles quedan marcados con `custom.demo_seed_id = rosa-reina-demo-v1` o `external_thread_id = rosa-reina-demo-v1`.

El script de limpieza borra u oculta solo esos datos demo. No elimina clientes reales, contactos reales, RAG real ni conversaciones reales.

Algunas tablas de la base usan soft-delete por trigger (`deleted_at`). En esos casos los registros demo dejan de verse en el CRM activo, aunque la base conserve una fila historica de auditoria. `npm run demo:status` cuenta solo lo visible/activo.

## Como verlo

1. Ejecuta `npm run demo:seed` o `npm run demo:seed:medium`.
2. Abre `http://localhost:3000/login`.
3. En local entra con `admin@test.com` / `admin`.
4. Revisa `Dashboard`, `Clientes`, `Pedidos`, `WhatsApp`, `Oportunidades` e `Importar`.

## Uso recomendado

Usa datos demo para validar diseno, navegacion, historiales, estados y demos comerciales. Para pruebas reales de WhatsApp/n8n, usa mensajes fisicos y despues ejecuta:

```bash
npm run audit:critical
```
