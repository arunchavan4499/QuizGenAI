# Hire4thon Agent Instructions

## Project Layout
- The repo is split by ownership area:
	- frontend/
	- backend/
	- llm_service/
	- db/
	- shared/
- Keep changes inside the owning module unless cross-module changes are required by API contract updates.

## Source of Truth
- API contracts live in shared/schemas and are the canonical interface between frontend, backend, and LLM services.
- Team boundaries and collaboration rules are defined in collab.md.

## Current Backend Status (as of 2026-03-27)
- Auth is implemented and enforced on protected routes.
- JWT bearer auth is integrated with FastAPI HTTPBearer, including Swagger Authorize support.
- Logout token revocation is implemented.
- Quiz and leaderboard endpoints are protected.
- Quiz business flow is implemented with reduced LLM call strategy:
	- Generate section quiz (one LLM call)
	- Submit answers scored locally with verification token
	- Final insights endpoint (one LLM call)
- Leaderboard supports DB-backed mode through USE_DB_LEADERBOARD flag.

## Current LLM Status
- Provider routing is task-aware in llm_service/providers/llm_provider.py.
- Default policy:
	- Topic quiz tasks -> Groq
	- RAG/document quiz tasks -> Qwen (NVIDIA endpoint)
	- Insight tasks -> Groq
	- Explain tasks -> Groq
- Provider fallback exists (preferred provider fails, alternate provider is attempted).
- JSON reliability path exists through generate_json with parse-retry behavior.

## Current RAG Status
- Document path is wired through llm_service/rag and backend document quiz generation flow.
- Retrieval implementation is currently in-memory lexical ranking (not persistent storage).

## DB and Migration Status
- db/ is the canonical DB package (config, database, models, migrations).
- Alembic configuration lives in db/alembic.ini and db/migrations/.
- DB schema includes users, quiz section tables, quiz_overall, and auth_tokens.
- Use DB-backed leaderboard by setting USE_DB_LEADERBOARD=true.

## Build and Run
- Frontend:
	- npm install
	- npm run dev
	- npm run build
	- npm run lint
	- npm run preview
- Backend:
	- Python 3.13+
	- Dependencies in backend/pyproject.toml and backend/uv.lock
	- Recommended test invocation from backend/: python -m pytest -q

## Backend Runtime Notes
- In some shells, uv run uvicorn may fail if uvicorn executable shim is not available.
- Reliable startup command from repo root:
	- backend/.venv/Scripts/python.exe -m uvicorn --app-dir backend app.main:app --host 127.0.0.1 --port 8000
- If port 8000 is busy, use an alternate port.

## Testing Reality
- Core test suites currently pass:
	- backend/tests/test_auth_flow.py
	- backend/tests/test_milestone1_flow.py
- Legacy integration test file backend/tests/test_llm_integration.py contains unauthenticated calls to now-protected endpoints and will fail until updated for auth headers.

## Working Conventions
- API contract first: update shared/schemas before wiring endpoints or UI changes.
- Prefer stable interfaces and loose coupling between modules.
- Do not reintroduce LLM mock fallback behavior where explicit LLM error signaling is expected.
- For protected endpoints, always include bearer token handling in tests and examples.

## Documentation Conventions
- Keep endpoint behavior documentation in docs/backend-endpoints.md aligned with current protected-route behavior and request/response contracts.
- Keep db handoff docs aligned with actual schema and migration head.
