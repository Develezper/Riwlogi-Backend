# Riwlogi Backend (Bun + Express)

Backend minimo para probar el frontend de Riwlogi con buenas practicas y estructura modular.

## Stack
- Bun runtime
- Node.js APIs
- Express
- Axios

## Estructura del proyecto
```text
src/
├─ app.js                # configura middlewares globales y API
├─ api.routes.js         # enrutador principal por feature
├─ server.js             # arranque del servidor
├─ config/               # variables de entorno y cliente HTTP
├─ data/                 # seeds, store en memoria y catalogo de problemas
├─ middleware/           # auth, manejo de errores y contexto por request
├─ features/             # modulos de dominio (auth, problems, submissions, etc.)
└─ utils/                # utilidades compartidas
```

## Ejecutar
```bash
cd backend
bun install
bun run dev
```

Servidor por defecto: `http://localhost:8000`.

## Exportar seed para handoff
```bash
bun run export:backend-seed
```

Genera/actualiza:
- `src/data/backend-handoff/full-seed.json`
- `src/data/backend-handoff/problems.seed.json`
- `src/data/backend-handoff/users.seed.json`
- `src/data/backend-handoff/leaderboard.seed.json`

Fuente de problemas para export:
- `backend/problems/*.json`
- fallback: `../frontend/problems/*.json`
- fallback: `../problems/*.json`

## Endpoints base
Bajo prefijo `/api`:
- `GET /`
- `GET /health`
- `POST /auth/login`
- `POST /auth/register`
- `GET /problems`
- `GET /problems/:slug`
- `GET /problems/tags`
- `POST /submissions/start` (auth)
- `POST /submissions/run` (auth)
- `POST /submissions/:id/submit` (auth)
- `POST /submissions/:id/events` (auth)
- `GET /leaderboard`
- `GET /profile/me` (auth)
- `GET /profile/submissions` (auth)

## Credenciales demo
- `demo@riwlogi.dev` / `123456`

## Notas
- Persistencia en memoria (suficiente para pruebas locales).
- El catalogo se carga primero desde `src/data/backend-handoff/*.json` y, si no existe, hace fallback a `problems/*.json`.
- Si quieres forzar frontend remoto, usa en frontend `.env`:
  - `VITE_API_MODE=remote`
  - `VITE_API_BASE=/api` (solo si frontend y backend comparten origen o existe proxy)
  - Si frontend corre en otro puerto/host sin proxy, usa URL absoluta:
    - `VITE_API_BASE=http://localhost:8000/api`
- CORS:
  - Por defecto permite cualquier origen (`CORS_ORIGINS=*`).
  - Puedes restringirlo con una lista separada por comas:
    - `CORS_ORIGINS=http://localhost:5173,https://tu-dominio.com`
