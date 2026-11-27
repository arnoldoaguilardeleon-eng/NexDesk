# Evidencia: tickets (crear, listar, detalle) y aislamiento (26/11/2026)

Servidor local (`npm run dev`), tokens de Supabase Auth de los 3 usuarios de prueba.
Datos: `backend/database/seed.sql` (10 tickets en Demo Corp, 1 en "Otra Corp") más un ticket creado manualmente por el empleado.

## Crear y listar

| Prueba | Esperado | Obtenido |
|---|---|---|
| Empleado `POST /tickets` | 201 | 201, `status: open`, `assigned_to: null`, `organization_id` y `reported_by` tomados de la sesión |
| Admin `POST /tickets` | 403 | 403 `Solo los empleados pueden crear tickets` |
| Título vacío | 400 | 400 `Datos inválidos` |
| Empleado `GET /tickets` | 200, solo los suyos | 200 |
| Admin `GET /tickets` | 200, todos | 200 |
| Técnico `GET /tickets` (sin asignados) | 200 `[]` | 200 `[]` |
| Sin token | 401 | 401 |

## Aislamiento (`GET /tickets/:id`)

| Prueba | Esperado | Obtenido |
|---|---|---|
| A. Empleado pide ticket de otro usuario (misma organización) | 404 | 404 `Ticket no encontrado` |
| B. Admin pide ticket de otra organización | 404 | 404 `Ticket no encontrado` |
| C. Admin pide ticket de su organización | 200 | 200 |
| D. Técnico pide ticket asignado a él | 200 | 200 |
| E. Técnico pide ticket sin asignar | 404 | 404 `Ticket no encontrado` |
| F. Empleado pide ticket de otra organización | 404 | 404 `Ticket no encontrado` |
| G. Id con formato inválido | 400 | 400 `Id de ticket inválido` |

## Cantidad de tickets visibles por rol (`GET /tickets?limit=100`)

| Rol | Obtenido | Detalle |
|---|---|---|
| Empleado | 9 | 8 del seed reportados por él + 1 creado manualmente |
| Técnico | 5 | los 5 asignados a él |
| Admin | 11 | todos los de Demo Corp; no incluye el de "Otra Corp" |

El seed es idempotente: se ejecutó dos veces sobre Supabase y el total se mantuvo (Demo Corp 11, Otra Corp 1).

Se responde 404 (y no 403) cuando el ticket existe pero no es visible, para no revelar su existencia.
