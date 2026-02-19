# Admin Endpoints - Riwlogi Backend

Este documento describe los endpoints de administración disponibles en el backend de Riwlogi.

## Autenticación

Todos los endpoints admin requieren:
1. **Autenticación**: Header `Authorization: Bearer <token>`
2. **Rol de administrador**: El usuario debe tener `role: "admin"`

### Usuario administrador por defecto

```
Email: admin@riwlogi.dev
Password: admin123
```

## Endpoints

### 1. GET /api/admin/overview

Obtiene estadísticas generales del sistema.

**Request:**
```bash
curl http://localhost:8000/api/admin/overview \
  -H "Authorization: Bearer <admin_token>"
```

**Response:**
```json
{
  "item": {
    "kpis": {
      "total_users": 3,
      "active_users_7d": 2,
      "total_problems": 10,
      "published_problems": 10,
      "draft_problems": 0,
      "total_submissions": 5,
      "accepted_submissions": 3,
      "acceptance_rate": 60,
      "ai_generated_problems": 0
    },
    "top_tags": [
      { "tag": "arrays", "count": 5 },
      { "tag": "strings", "count": 3 }
    ],
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

---

### 2. GET /api/admin/users

Lista todos los usuarios del sistema con estadísticas.

**Request:**
```bash
curl http://localhost:8000/api/admin/users \
  -H "Authorization: Bearer <admin_token>"
```

**Response:**
```json
{
  "items": [
    {
      "id": "user_admin",
      "username": "admin",
      "email": "admin@riwlogi.dev",
      "role": "admin",
      "is_admin": true,
      "display_name": "Administrator",
      "created_at": "2026-01-01T10:00:00.000Z",
      "submissions_count": 0,
      "solved_count": 0,
      "last_active_at": null
    },
    {
      "id": "user_demo",
      "username": "demo",
      "email": "demo@riwlogi.dev",
      "role": "user",
      "is_admin": false,
      "display_name": "Demo User",
      "created_at": "2026-01-03T10:00:00.000Z",
      "submissions_count": 5,
      "solved_count": 3,
      "last_active_at": "2026-02-18T10:00:00.000Z"
    }
  ]
}
```

---

### 3. DELETE /api/admin/users/:id

Elimina un usuario del sistema.

**Request:**
```bash
curl -X DELETE http://localhost:8000/api/admin/users/user_demo \
  -H "Authorization: Bearer <admin_token>"
```

**Response:**
```json
{
  "ok": true
}
```

---

### 4. GET /api/admin/problems

Lista todos los problemas con información administrativa.

**Request:**
```bash
curl http://localhost:8000/api/admin/problems \
  -H "Authorization: Bearer <admin_token>"
```

**Response:**
```json
{
  "items": [
    {
      "id": "two-sum",
      "slug": "two-sum",
      "title": "Two Sum",
      "difficulty": 1,
      "tags": ["arrays", "hash-table"],
      "acceptance": 45,
      "submissions": 1200,
      "stages_count": 2,
      "status": "published",
      "source": "custom",
      "ai_generated": false,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z",
      "last_generated_prompt": "",
      "statement_md": "...",
      "starter_code": { ... },
      "stages": [ ... ]
    }
  ]
}
```

---

### 5. POST /api/admin/problems/generate

Genera un nuevo problema en memoria a partir de un prompt.

**Request:**
```bash
curl -X POST http://localhost:8000/api/admin/problems/generate \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a problem about sorting algorithms for beginners"
  }'
```

**Response:**
```json
{
  "item": {
    "id": "ai-generated-1708257600000",
    "slug": "ai-generated-1708257600000",
    "title": "AI Generated Problem",
    "difficulty": 2,
    "tags": ["ai-generated"],
    "acceptance": 0,
    "submissions": 0,
    "stages_count": 1,
    "statement_md": "## AI Generated Problem\n\nPrompt: ...",
    "starter_code": {
      "python": "def solve():\n    # AI generated solution\n    pass",
      "javascript": "function solve() {\n  // AI generated solution\n}"
    },
    "stages": [...],
    "status": "draft",
    "source": "ai",
    "ai_generated": true,
    "last_generated_prompt": "Create a problem about sorting algorithms for beginners",
    "created_at": "2026-02-18T12:00:00.000Z",
    "updated_at": "2026-02-18T12:00:00.000Z"
  }
}
```

---

### 6. PATCH /api/admin/problems/:id

Actualiza un problema existente.

**Request:**
```bash
curl -X PATCH http://localhost:8000/api/admin/problems/two-sum \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "published",
    "difficulty": 2
  }'
```

**Response:**
```json
{
  "item": {
    "id": "two-sum",
    "slug": "two-sum",
    "title": "Two Sum",
    "difficulty": 2,
    "status": "published",
    "updated_at": "2026-02-18T12:00:00.000Z",
    ...
  }
}
```

---

### 7. DELETE /api/admin/problems/:id

Elimina un problema del sistema.

**Request:**
```bash
curl -X DELETE http://localhost:8000/api/admin/problems/two-sum \
  -H "Authorization: Bearer <admin_token>"
```

**Response:**
```json
{
  "ok": true
}
```

---

## Errores comunes

### 401 Unauthorized
```json
{
  "error": {
    "status": 401,
    "message": "Debes iniciar sesión para continuar."
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "status": 403,
    "message": "Acceso denegado. Se requiere rol de administrador."
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "status": 404,
    "message": "Usuario no encontrado."
  }
}
```

---

## Flujo completo de prueba

```bash
# 1. Login como admin
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@riwlogi.dev","password":"admin123"}' \
  | jq -r '.access_token')

# 2. Ver estadísticas
curl http://localhost:8000/api/admin/overview \
  -H "Authorization: Bearer $TOKEN"

# 3. Listar usuarios
curl http://localhost:8000/api/admin/users \
  -H "Authorization: Bearer $TOKEN"

# 4. Listar problemas
curl http://localhost:8000/api/admin/problems \
  -H "Authorization: Bearer $TOKEN"

# 5. Generar problema con IA
curl -X POST http://localhost:8000/api/admin/problems/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a beginner-friendly array problem"}'
```

---

## Notas de implementación

- **Persistencia**: Actualmente usa `InMemoryStore`. Los cambios se pierden al reiniciar.
- **Generación IA**: El endpoint `POST /problems/generate` crea un borrador en memoria a partir del prompt.
- **Eliminaciones**: Las eliminaciones son en memoria y no persisten tras reiniciar el backend.
