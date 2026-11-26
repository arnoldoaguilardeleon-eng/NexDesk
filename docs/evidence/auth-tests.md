# Evidencia: autenticación y roles (26/11/2026)

Login con Supabase Auth (`POST /auth/v1/token?grant_type=password`), luego peticiones al backend con `Authorization: Bearer <JWT>`.

| Petición | Código | Respuesta |
|---|---|---|
| GET /me (admin) | 200 | `{"email":"admin@test.com","role":"admin","organizationId":"7e923dea-..."}` |
| GET /admin-only (admin) | 200 | `{"ok":true,"message":"Hola admin, tienes acceso de administrador"}` |
| GET /admin-only (empleado) | 403 | `{"error":"No tienes permiso para esta operación"}` |
| GET /me (sin token) | 401 | `{"error":"Falta el token de autenticación"}` |

El rol se consulta en PostgreSQL (`organization_members`) en cada petición.
