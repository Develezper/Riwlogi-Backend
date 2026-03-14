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
  - ejemplos de payload API
- `src/data/backend-handoff/problems.seed.json`: solo problemas.
- `src/data/backend-handoff/users.seed.json`: usuarios demo seed.

## Fuente de datos

- Problemas: `problems/*.json`
- Seed de usuarios: `src/shared/services/api/local-provider.js`
