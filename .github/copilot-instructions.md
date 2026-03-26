# Project Guidelines

## Architecture
- The repo is split into frontend/, backend/, llm_service/, db/, and shared/; keep changes within the owning area.
- API contracts live in shared/schemas and are the source of truth for backend, frontend, and LLM outputs.
- Team boundaries and collaboration rules: see ../collab.md.

## Build and Test
- Frontend (frontend/): npm install, npm run dev, npm run build, npm run lint, npm run preview.
- Backend (backend/): Python 3.13+, FastAPI; dependencies tracked in backend/pyproject.toml and backend/uv.lock. No test runner command is documented yet.

## Conventions
- API contract first: update shared/schemas before wiring endpoints or UI.
- Keep modules loosely coupled; prefer stable interfaces over cross-module changes.
