# Riwlogi Backend (Bun + Express)

Minimal backend used to test the Riwlogi frontend. The project follows modular structure and common best practices to provide a small, testable API implementation that covers persistence, authentication, and submission workflows.

Table of contents
- About
- Stack
- Prerequisites
- Project structure
- Quick start
- Scripts
- Configuration / Environment variables
- API endpoints
- Demo credentials
- Data export (handoff) and seed files
- Notes and deployment considerations
- Contributing

About
This repository implements a lightweight backend for Riwlogi that exposes REST endpoints used by the frontend. It uses in-memory persistence (suitable for local development and frontend testing) and provides features such as user authentication, problem catalog endpoints, submission lifecycle, and a simple leaderboard.

Stack
- Bun runtime (uses Node.js compatible APIs)
- Express
- Axios (HTTP client)

Prerequisites
- Bun installed (https://bun.sh). The code is intended to run on Bun and relies on Bun's runtime and tooling.
- Node-compatible environment for local development when using non-Bun tooling (not required if you use Bun).

Project structure
```text
src/
├─ app.js                # configures global middlewares and API
├─ api.routes.js         # main router organized by feature
├─ server.js             # server bootstrap
├─ config/               # environment variables and HTTP client
├─ data/                 # seeds, in-memory store and problems catalog
├─ middleware/           # auth, error handling and request context
├─ features/             # domain modules (auth, problems, submissions, etc.)
└─ utils/                # shared utilities
```

Quick start
From the repository root (or `backend` directory if this repository is nested inside a mono-repo):

```bash
bun install
bun run dev
```

Default server URL: http://localhost:8000

Scripts
- bun run dev — start development server (hot reload depending on setup)
- bun test — run test suite
- bun run export:backend-seed — generate backend handoff seed files (see section below)

Configuration / Environment variables
The backend supports configuration via environment variables. Below are the most relevant ones referenced in the project and common defaults or examples:

- PORT — HTTP server port (default: 8000)
- API_PREFIX — API prefix (default: /api) — endpoints listed below assume this prefix
- CORS_ORIGINS — Allowed CORS origins. Default `*`. Example to restrict: `http://localhost:5173,https://your-domain.com`
- CLASSIFIER_API_BASE — Base URL for external classifier/AI service (if configured)
- CLASSIFIER_API_TIMEOUT_MS — Request timeout for classifier calls (example: 12000)
- CLASSIFIER_API_MAX_RETRIES — Max retries for classifier requests (example: 6)
- CLASSIFIER_API_RETRY_DELAY_MS — Initial retry delay in ms (example: 1200)
- CLASSIFIER_API_RETRY_MAX_DELAY_MS — Max retry delay in ms (example: 10000)
- CLASSIFIER_API_RETRY_BACKOFF — Backoff multiplier (example: 1.7)
- CLASSIFIER_API_RETRY_MAX_ELAPSED_MS — Max total retry elapsed ms (example: 90000)

Notes on frontend / API base
If you want the frontend to use a remote backend, configure the frontend environment (example using Vite):
- VITE_API_MODE=remote
- VITE_API_BASE=/api (if frontend and backend share origin or a proxy is used)
- If the frontend runs on a different host/port without proxy, use an absolute URL:
  - VITE_API_BASE=http://localhost:8000/api

API endpoints (base prefix: /api)
- GET /               — API root / basic information
- GET /health         — Health check
- POST /auth/login    — Login (returns auth token or session)
- POST /auth/register — Register new user
- POST /auth/logout   — Logout (authentication required)
- GET /problems       — List problems
- GET /problems/:slug — Get problem by slug
- GET /problems/tags  — List tags
- POST /submissions/start   — Start a submission attempt (authentication required)
- POST /submissions/run     — Run code against selected test cases / judge (authentication required)
- POST /submissions/:id/submit — Finalize a submission (authentication required)
- POST /submissions/:id/events — Submit runtime events / logs for a submission (authentication required)
- GET /leaderboard     — Leaderboard / ranking
- GET /profile/me      — Current user profile (authentication required)
- GET /profile/submissions — Current user submissions (authentication required)

Examples
Login (example cURL):
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@riwlogi.dev","password":"123456"}'
```

Fetch problems:
```bash
curl http://localhost:8000/api/problems
```

Demo credentials
- demo@riwlogi.dev / 123456

Data export (backend handoff) and seed files
There is a task to export seed data that converts frontend-baked problem files into backend-friendly JSON files. To generate or update the handoff files:

```bash
bun run export:backend-seed
```

This generates/updates the following files:
- src/data/backend-handoff/full-seed.json
- src/data/backend-handoff/problems.seed.json
- src/data/backend-handoff/users.seed.json
- src/data/backend-handoff/leaderboard.seed.json

Problem source for export:
- backend/problems/*.json
- fallback: ../frontend/problems/*.json
- fallback: ../problems/*.json

Notes
- Persistence is in-memory by default (suitable for local testing). This means data is not persisted across restarts.
- The problems catalog is loaded first from `src/data/backend-handoff/*.json`. If not found, the code falls back to `problems/*.json`.
- CORS: default allows any origin (`CORS_ORIGINS=*`) but you can and should restrict this in production.

Resilience settings for services that may be in cold start (e.g., hosted on Render)
The project exposes several configuration values that allow retry/backoff control for external AI/classifier services. Example recommended defaults:
- CLASSIFIER_API_TIMEOUT_MS=12000
- CLASSIFIER_API_MAX_RETRIES=6
- CLASSIFIER_API_RETRY_DELAY_MS=1200
- CLASSIFIER_API_RETRY_MAX_DELAY_MS=10000
- CLASSIFIER_API_RETRY_BACKOFF=1.7
- CLASSIFIER_API_RETRY_MAX_ELAPSED_MS=90000

If an external service takes ~1 minute to "wake up", increase `CLASSIFIER_API_MAX_RETRIES` and/or `CLASSIFIER_API_RETRY_MAX_ELAPSED_MS`.

Testing
Run the test suite with:
```bash
bun test
```

Deployment considerations
- In production you should replace in-memory persistence with a durable datastore (Postgres, MongoDB, etc.).
- Secure configuration: ensure CORS, secrets, and any external API keys are stored in a secure secret manager or environment, and not checked into source control.
- Use appropriate process managers and health checks when deploying (platform-specific settings for Render, Docker, etc.).
- When using an external classifier/AI service, configure retry/backoff values that match the platform's cold-start characteristics.

Contributing
Contributions and suggestions are welcome. If you plan to add features or make structural changes, open an issue describing the change first so we can align on API shape and data formats.

License
No license information is included in this repository. Add a LICENSE file to clarify terms if you plan to publish or share widely.
