# API Contract (Frontend <-> Backend)

Base URL default: `/api` (override with `VITE_API_BASE`).

All JSON requests/responses use `Content-Type: application/json`.

## Health
- `GET /health`
- Response:
```json
{ "ok": true }
```

## Auth
- `POST /auth/login`
- Body:
```json
{ "email": "demo@riwlog.dev", "password": "123456" }
```
- Response:
```json
{
  "access_token": "token_or_jwt",
  "user": {
    "id": "user_1",
    "username": "demo",
    "email": "demo@riwlog.dev",
    "display_name": "Demo",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

- `POST /auth/register`
- Body:
```json
{ "username": "demo", "email": "demo@riwlog.dev", "password": "123456" }
```
- Response: same shape as login.

## Problems
- `GET /problems?difficulty=1&search=two&tag=Arrays`
- Response:
```json
{
  "items": [
    {
      "id": "two-sum",
      "slug": "two-sum",
      "title": "Two Sum",
      "difficulty": 1,
      "tags": ["Arrays"],
      "acceptance": 49.2,
      "submissions": 14523,
      "stages_count": 3
    }
  ]
}
```

- `GET /problems/:slug`
- Response:
```json
{
  "item": {
    "id": "two-sum",
    "slug": "two-sum",
    "title": "Two Sum",
    "difficulty": 1,
    "tags": ["Arrays"],
    "acceptance": 49.2,
    "submissions": 14523,
    "stages_count": 3,
    "statement_md": "## Description...",
    "starter_code": {
      "python": "def solve():\n    pass",
      "javascript": "function solve() {}"
    },
    "stages": [
      {
        "id": "two-sum-stage-1",
        "stage_index": 1,
        "prompt_md": "Implement stage 1",
        "hidden_count": 3,
        "visible_tests": [
          { "input_text": "nums=[2,7], target=9", "expected_text": "[0,1]" }
        ]
      }
    ]
  }
}
```

- `GET /problems/tags`
- Response:
```json
{ "items": ["Arrays", "Dynamic Programming"] }
```

## Submissions (Auth required)
- `POST /submissions/start`
- Body:
```json
{ "problem_id": "two-sum", "language": "python" }
```
- Response:
```json
{ "submission_id": "sub_123" }
```

- `POST /submissions/run`
- Body:
```json
{
  "submission_id": "sub_123",
  "stage_id": "two-sum-stage-1",
  "code": "...",
  "events": []
}
```
- Response:
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

- `POST /submissions/:id/submit`
- Response:
```json
{ "verdict": "accepted", "final_score": 91 }
```

- `POST /submissions/:id/events`
- Body:
```json
{ "events": [] }
```
- Response:
```json
{ "ok": true }
```

## Leaderboard
- `GET /leaderboard?timeframe=all`
- Response:
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
  ]
}
```

## Profile (Auth required)
- `GET /profile/me`
- Response:
```json
{
  "user": {
    "id": "user_1",
    "username": "demo",
    "email": "demo@riwlog.dev",
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

- `GET /profile/submissions`
- Response:
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
  ]
}
```
