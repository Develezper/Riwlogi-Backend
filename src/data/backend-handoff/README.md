# Backend Handoff Seed Data

Estos archivos se generan desde los datos quemados del frontend para entregarlos al backend.

## Generar/actualizar

```bash
bun run export:backend-seed
```

## Archivos resultantes

- `src/data/backend-handoff/full-seed.json`:
  - problemas normalizados
  - tags
  - usuarios demo seed
  - leaderboard seed
  - ejemplos de payload API
- `src/data/backend-handoff/problems.seed.json`: solo problemas.
- `src/data/backend-handoff/users.seed.json`: usuarios demo seed.
- `src/data/backend-handoff/leaderboard.seed.json`: leaderboard seed.

## Fuente de datos

- Problemas: `problems/*.json`
- Seeds de usuario/leaderboard: `src/shared/services/api/local-provider.js`
