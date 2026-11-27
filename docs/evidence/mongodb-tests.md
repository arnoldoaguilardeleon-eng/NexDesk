# Evidencia: MongoDB Atlas, conversaciones y mensajes (26/11/2026)

Prueba de humo: `npx tsx scripts/mongo-smoke.ts` (desde `backend/`). Crea datos con ids aleatorios y los elimina al terminar.

| Prueba | Esperado | Obtenido |
|---|---|---|
| Crear conversación | Se crea | OK, `_id` generado |
| Listar conversaciones del usuario | 1 | OK, 1 |
| Guardar 2 mensajes y leerlos | `user -> assistant` en orden | OK |
| Otro usuario (misma organización) lee la conversación | Rechazo | OK: `Conversación no encontrada` |
| Mismo usuario, otra organización | Rechazo | OK: `Conversación no encontrada` |
| Otro usuario escribe en la conversación | Rechazo | OK: `Conversación no encontrada` |
| Id con formato inválido | Rechazo | OK: `Id de conversación inválido` |
| Limpieza de datos de prueba | Eliminados | OK |

## Salud del servicio

`GET /health` -> `{"ok":true,"db":"up","mongo":"up"}` (HTTP 200): PostgreSQL y MongoDB conectados.

## Índices (se crean al arrancar el backend)

- `conversations`: `{ user_id, organization_id, updated_at: -1 }`
- `messages`: `{ conversation_id, created_at }` y `{ user_id, created_at: -1 }`

Nota: el Avance 1 pedía índices en `conversation_id`, `user_id` y `created_at`; se cubren con dos índices compuestos.
