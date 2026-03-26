# Database Setup (PostgreSQL + SQLAlchemy + Alembic)

This folder contains database migration infrastructure and schema history.

## Directory Layout
- `db/config.py`: environment-based DB and JWT settings
- `db/database.py`: SQLAlchemy engine, session factory, base class
- `db/models.py`: ORM table models for users, quiz sections, overall scores, and auth tokens
- `db/migrations/`: Alembic migration scripts

## Stack
- PostgreSQL
- SQLAlchemy ORM models in backend app
- Alembic migrations in this folder

## Prerequisites
- PostgreSQL running locally or remotely
- env values available in project `.env` (copy from `db/.env.example`)
- backend dependencies installed with `uv`

Required env variables:
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_HOSTNAME`
- `DB_PORT`
- `DB_NAME`

Optional override:
- `DATABASE_URL`

## Initial Migration Included
- Revision: `20260326_01`
- File: `db/migrations/versions/20260326_01_init_schema.py`

Tables created:
- `users`
- `quiz_beginner`
- `quiz_intermediate`
- `quiz_advanced`
- `quiz_overall`
- `auth_tokens`

## Run Migrations
From project root:

1. `cd backend`
2. `uv run alembic -c ..\\db\\alembic.ini upgrade head`

## Rollback One Revision
1. `cd backend`
2. `uv run alembic -c ..\\db\\alembic.ini downgrade -1`

## Generate New Revision (autogenerate)
1. `cd backend`
2. `uv run alembic -c ..\\db\\alembic.ini revision --autogenerate -m "describe change"`

## Backend Runtime Toggle
- By default, leaderboard service uses in-memory storage.
- To enable DB-backed leaderboard writes/reads, set:

`USE_DB_LEADERBOARD=true`

This keeps local development stable while DB setup is in progress.
