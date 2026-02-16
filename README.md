# Riwlog Backend (Bun + Express)

Backend minimo para probar el frontend de Riwlog con buenas practicas y estructura modular.

## Stack
- Bun runtime
- Node.js APIs
- Express
- Axios

## Ejecutar
```bash
cd backend
bun install
bun run dev
```

Servidor por defecto: `http://localhost:8000`.

## Endpoints base
Bajo prefijo `/api`:
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
- `demo@riwlog.dev` / `123456`

## Notas
- Persistencia en memoria (suficiente para pruebas locales).
- Catalogo de problemas cargado desde `../problems`.
- Si quieres forzar frontend remoto, usa en frontend `.env`:
  - `VITE_API_MODE=remote`
  - `VITE_API_BASE=/api`
