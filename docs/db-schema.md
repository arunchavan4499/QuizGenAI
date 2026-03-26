# Database Schema Handoff

## Status
- PostgreSQL + SQLAlchemy models added in backend.
- Alembic migration scaffold added in root db folder.
- Initial schema migration created and discoverable.

## Implemented Tables

### users
- `id` (PK, string)
- `name`
- `email` (unique)
- `password_hash` (argon2 hash string)
- `created_at`

### quiz_beginner
- `id` (PK)
- `user_id` (FK -> users.id)
- `time_started`
- `time_taken_seconds`
- `marks`
- `total_marks`
- `created_at`

### quiz_intermediate
- Same fields as `quiz_beginner`

### quiz_advanced
- Same fields as `quiz_beginner`

### quiz_overall
- `id` (PK)
- `user_id` (FK -> users.id)
- `time_started`
- `time_taken_seconds`
- `marks`
- `insights`
- `created_at`

### auth_tokens
- `id` (PK)
- `user_id` (FK -> users.id)
- `token` (unique)
- `created_at`

## Leaderboard Strategy
- Section leaderboards are sourced from:
  - beginner -> `quiz_beginner`
  - intermediate -> `quiz_intermediate`
  - advanced -> `quiz_advanced`
- Overall leaderboard can be sourced from `quiz_overall`.

## Current Backend Behavior
- Existing API behavior is unchanged for milestone stability.
- DB leaderboard mode is feature-toggled via env var:
  - `USE_DB_LEADERBOARD=true`
- If user row does not exist yet, backend creates a placeholder user record before score insert.

## Migration Files
- Alembic config: `db/alembic.ini`
- Env script: `db/migrations/env.py`
- Initial revision: `db/migrations/versions/20260326_01_init_schema.py`

## Run Migrations
1. `cd backend`
2. `uv run alembic -c ..\\db\\alembic.ini upgrade head`

## Notes on Synchronization with LLM + Backend
- LLM output contract currently aligns with backend for:
  - quiz generation: `questions[]`
  - answer evaluation: `score` + `insights`
- DB layer is now ready to persist section scores while LLM work continues.
