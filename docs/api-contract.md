# API Contract (Frontend <-> Backend)

Contrato actualizado según el backend actual.

Fuente de verdad de contrato:
- OpenAPI JSON runtime: `GET /api/openapi.json`
- Export estático: `docs/openapi.json` (generado con `bun run export:openapi`)

## 1. Base y Convenciones

- Base API por defecto: `/api`
- Salud global (fuera de API): `GET /`
- `Content-Type`: JSON en requests/responses.
- Fechas: ISO 8601 UTC (`2026-02-25T12:00:00.000Z`).
- IDs: string.

### Auth Header

Para endpoints protegidos:

```http
Authorization: Bearer <access_token>
```

## 2. Respuesta de Errores

Formato estándar:

```json
{
  "message": "Texto del error",
  "detail": "Opcional"
}
```

- `detail` aparece solo cuando aplica (por ejemplo, errores internos fuera de `production`).
- Para rutas no existentes:

```json
{
  "message": "Ruta no encontrada: GET /api/lo-que-sea"
}
```

### Códigos comunes

- `400`: validación / reglas de negocio.
- `401`: no autenticado / sesión inválida.
- `403`: autenticado pero sin permisos.
- `404`: recurso no encontrado.
- `409`: conflicto (username/email duplicado, slug en uso).
- `429`: rate limit excedido.
- `503`: servicio no listo (readiness check).
- `500`: error interno.

### Error `400` example (validación)

Request:

`POST /api/auth/register`

```json
{ "username": "demo", "email": "email-invalido", "password": "123456" }
```

Response `400`:

```json
{ "message": "Debes enviar un email válido." }
```

### Error `401` example (sin token)

Request:

`GET /api/profile/me` (sin header `Authorization`)

Response `401`:

```json
{ "message": "Debes iniciar sesión para continuar." }
```

### Error `429` example (rate limit)

Request:

`POST /api/auth/login` (demasiados intentos en la ventana configurada)

Response `429`:

```json
{ "message": "Demasiados intentos de autenticación. Intenta nuevamente más tarde." }
```

## 3. Health

### GET /

Response `200`:

```json
{
  "ok": true,
  "service": "riwlogi-backend",
  "docs": "/api/health"
}
```

### GET /api

Response `200`:

```json
{
  "ok": true,
  "status": "ok",
  "service": "riwlogi-backend",
  "health": { "method": "GET", "path": "/health" }
}
```

### GET /api/health

Response `200`:

```json
{ "ok": true, "status": "ok" }
```

### GET /api/health/live

Response `200`:

```json
{
  "ok": true,
  "status": "alive",
  "service": "riwlogi-backend",
  "environment": "development",
  "timestamp": "2026-02-25T12:00:00.000Z",
  "uptime_s": 123,
  "checks": { "process": "up", "event_loop": "up" }
}
```

### GET /api/health/ready

Response `200` (listo):

```json
{
  "ok": true,
  "status": "ready",
  "service": "riwlogi-backend",
  "environment": "development",
  "timestamp": "2026-02-25T12:00:00.000Z",
  "uptime_s": 123,
  "checks": {
    "store": {
      "ok": true,
      "provider": "memory",
      "checks": { "sessions_cache": "up", "submissions_cache": "up" }
    }
  }
}
```

Response `503` (no listo):

```json
{
  "ok": false,
  "status": "not_ready",
  "service": "riwlogi-backend",
  "environment": "production",
  "timestamp": "2026-02-25T12:00:00.000Z",
  "uptime_s": 4,
  "checks": {
    "store": {
      "ok": false,
      "provider": "postgres",
      "error": "getaddrinfo ECONNREFUSED"
    }
  }
}
```

## 4. Auth

### POST /api/auth/login

Body:

```json
{ "identifier": "demo@riwlogi.dev", "password": "123456" }
```

Notas:
- `identifier` puede ser email o username.
- También funciona con `email` en lugar de `identifier`.

Response `200`:

```json
{
  "access_token": "token",
  "expires_at": "2026-02-25T20:00:00.000Z",
  "user": {
    "id": "user_demo",
    "username": "demo",
    "email": "demo@riwlogi.dev",
    "role": "user",
    "display_name": "Demo",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

### POST /api/auth/register

Body:

```json
{ "username": "demo", "email": "demo@riwlogi.dev", "password": "123456" }
```

Response `201`: mismo shape que login.

### POST /api/auth/logout

Auth: requerida.

Response `200`:

```json
{ "ok": true }
```

## 5. Problems

### GET /api/problems

Query params opcionales:

- `difficulty` (número)
- `search` (string, case-insensitive en `title`)
- `tag` (string, case-insensitive)
- `page` (entero > 0, default `1`)
- `limit` (entero > 0, default `20`, máximo `100`)

Ejemplo:

`GET /api/problems?difficulty=1&search=two&tag=arrays&page=1&limit=20`

Response `200`:

```json
{
  "items": [
    {
      "id": "two-sum",
      "slug": "two-sum",
      "title": "Two Sum",
      "difficulty": 1,
      "tags": ["arrays"],
      "acceptance": 49.2,
      "submissions": 14523,
      "stages_count": 3
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1,
  "total_pages": 1,
  "has_prev": false,
  "has_next": false
}
```

### GET /api/problems/:slug

Response `200`:

```json
{
  "item": {
    "id": "two-sum",
    "slug": "two-sum",
    "title": "Two Sum",
    "difficulty": 1,
    "tags": ["arrays"],
    "acceptance": 49.2,
    "submissions": 14523,
    "stages_count": 3,
    "statement_md": "## Description...",
    "starter_code": {
      "python": "def solve():\n    pass",
      "javascript": "function solve() {}",
      "typescript": "function solve(): any {}"
    },
    "stages": [
      {
        "id": "two-sum-stage-1",
        "stage_index": 1,
        "prompt_md": "Implement stage 1",
        "time_limit_ms": 0,
        "hidden_count": 3,
        "visible_tests": [
          { "input_text": "nums=[2,7], target=9", "expected_text": "[0,1]" }
        ]
      }
    ]
  }
}
```

### GET /api/problems/tags

Response `200`:

```json
{ "items": ["arrays", "dynamic-programming"] }
```

## 6. Submissions (Auth requerida)

### POST /api/submissions/start

Body:

```json
{ "problem_id": "two-sum", "language": "python" }
```

`language` permitido: `python | javascript | typescript` (si no viene, usa `python`).

Response `201`:

```json
{ "submission_id": "sub_123" }
```

### POST /api/submissions/run

Body:

```json
{
  "submission_id": "sub_123",
  "stage_id": "two-sum-stage-1",
  "code": "def solve():\n  pass",
  "events": [
    { "type": "key", "char_count": 5, "timestamp": "2026-02-25T12:00:00.000Z" }
  ]
}
```

Notas sobre `events`:
- Se procesan máximo 200 eventos por request.
- `char_count` se normaliza a rango `0..100000`.
- `timestamp` inválido se reemplaza con hora actual del servidor.

Response `200`:

```json
{
  "result": {
    "passed": true,
    "stage_index": 1,
    "stage_score": 88,
    "runtime_ms": 32,
    "visible_results": [
      {
        "input_text": "...",
        "expected_text": "...",
        "passed": true,
        "error": null
      }
    ],
    "classification": {
      "label": "human",
      "confidence": 0.91
    }
  }
}
```

`classification.label`: `human | assisted | ai_generated`.

### POST /api/submissions/:id/submit

Response `200`:

```json
{ "verdict": "accepted", "final_score": 91 }
```

`verdict`: `accepted | wrong_answer`.

### POST /api/submissions/:id/events

Body:

```json
{ "events": [] }
```

Response `200`:

```json
{ "ok": true }
```

## 7. Leaderboard

### GET /api/leaderboard

Query param opcional:
- `timeframe`: `today | week | all` (si viene inválido, usa `all`).
- `page` (entero > 0, default `1`)
- `limit` (entero > 0, default `20`, máximo `100`)

Response `200`:

```json
{
  "items": [
    {
      "rank": 1,
      "username": "algorithmist",
      "avatar": "A",
      "score": 4850,
      "total_score": 4850,
      "solved": 87,
      "streak": 32
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1,
  "total_pages": 1,
  "has_prev": false,
  "has_next": false
}
```

## 8. Profile (Auth requerida)

### GET /api/profile/me

Response `200`:

```json
{
  "user": {
    "id": "user_1",
    "username": "demo",
    "email": "demo@riwlogi.dev",
    "display_name": "Demo",
    "created_at": "2026-01-01T00:00:00.000Z"
  },
  "stats": {
    "total_score": 1234,
    "solved": 12,
    "by_difficulty": { "easy": 5, "medium": 5, "hard": 2 }
  },
  "streak": 4,
  "rank": 12,
  "badges": [{ "name": "First Solve", "description": "...", "icon": "award" }]
}
```

### GET /api/profile/submissions

Query params opcionales:
- `page` (entero > 0, default `1`)
- `limit` (entero > 0, default `20`, máximo `100`)

Response `200`:

```json
{
  "items": [
    {
      "id": "sub_123",
      "problem_id": "two-sum",
      "problem_title": "Two Sum",
      "verdict": "accepted",
      "language": "python",
      "final_score": 90,
      "runtime_ms": 20,
      "submitted_at": "2026-02-14T18:00:00.000Z",
      "stage_results": {}
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1,
  "total_pages": 1,
  "has_prev": false,
  "has_next": false
}
```

## 9. Admin (Auth + role admin)

Todos requieren token de usuario con `role = "admin"`.

### GET /api/admin/overview

Response `200`:

```json
{
  "item": {
    "kpis": {
      "total_users": 3,
      "active_users_7d": 2,
      "total_problems": 10,
      "published_problems": 9,
      "draft_problems": 1,
      "total_submissions": 5,
      "accepted_submissions": 3,
      "acceptance_rate": 60,
      "ai_generated_problems": 1
    },
    "top_tags": [{ "tag": "arrays", "count": 5 }],
    "recent_activity": [
      {
        "id": "sub_123",
        "type": "submission_accepted",
        "label": "Two Sum by user user_demo",
        "created_at": "2026-02-18T10:00:00.000Z"
      }
    ],
    "updated_at": "2026-02-18T12:00:00.000Z"
  }
}
```

### GET /api/admin/users

Query params opcionales:
- `page` (entero > 0, default `1`)
- `limit` (entero > 0, default `20`, máximo `100`)

Response `200`:

```json
{
  "items": [
    {
      "id": "user_admin",
      "username": "admin",
      "email": "admin@riwlogi.dev",
      "role": "admin",
      "is_admin": true,
      "display_name": "admin",
      "created_at": "2026-01-01T10:00:00.000Z",
      "submissions_count": 0,
      "solved_count": 0,
      "last_active_at": null
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1,
  "total_pages": 1,
  "has_prev": false,
  "has_next": false
}
```

### DELETE /api/admin/users/:id

Response `200`:

```json
{
  "ok": true,
  "deleted_user_id": "user_demo"
}
```

### GET /api/admin/problems

Query params opcionales:
- `page` (entero > 0, default `1`)
- `limit` (entero > 0, default `20`, máximo `100`)

Response `200`:

```json
{
  "items": [
    {
      "id": "two-sum",
      "slug": "two-sum",
      "title": "Two Sum",
      "difficulty": 1,
      "tags": ["arrays"],
      "acceptance": 45,
      "submissions": 1200,
      "stages_count": 2,
      "statement_md": "...",
      "starter_code": {},
      "stages": [],
      "status": "published",
      "source": "custom",
      "ai_generated": false,
      "last_generated_prompt": "",
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1,
  "total_pages": 1,
  "has_prev": false,
  "has_next": false
}
```

### POST /api/admin/problems/generate

Body:

```json
{
  "prompt": "Create a beginner-friendly array problem"
}
```

Regla: `prompt` mínimo 10 caracteres.

Response `201`:

```json
{
  "item": {
    "id": "ai-...",
    "slug": "ai-...",
    "title": "AI Generated Problem",
    "status": "draft",
    "source": "ai",
    "ai_generated": true,
    "last_generated_prompt": "Create a beginner-friendly array problem"
  }
}
```

### PATCH /api/admin/problems/:id

Body: solo acepta estos campos (opcionales):

- `slug`
- `title`
- `difficulty`
- `tags`
- `acceptance`
- `submissions`
- `description`
- `examples`
- `constraints`
- `statement_md`
- `starter_code`
- `stages`
- `stages_count`
- `status`
- `source`
- `last_generated_prompt`

Response `200`:

```json
{
  "item": {
    "id": "two-sum",
    "slug": "two-sum",
    "title": "Two Sum",
    "status": "published",
    "updated_at": "2026-02-25T12:00:00.000Z"
  }
}
```

### DELETE /api/admin/problems/:id

Response `200`:

```json
{
  "ok": true,
  "deleted_problem_id": "two-sum"
}
```
