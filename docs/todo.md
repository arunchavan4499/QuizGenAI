# Hire4thon Project To-Do

## How to use this file
- Status values: `todo`, `in-progress`, `blocked`, `done`
- Update owner and date when status changes.
- Keep all API contract updates synchronized with `shared/schemas`.

## Milestone 1: Contract + Backend Skeleton (Current)
- [ ] Status: in-progress | Owner: Jayaditya (Backend)
  - Finalize and review schema files in `shared/schemas` for:
    - quiz generation request/response
    - answer submission request/response
    - insights payload
    - leaderboard payload
  - Done when: frontend and LLM confirm schema compatibility.

- [ ] Status: in-progress | Owner: Jayaditya (Backend)
  - Keep endpoint skeleton stable:
    - `POST /quiz/generate`
    - `POST /quiz/submit`
    - `GET /leaderboard/{difficulty}`
    - `GET /health`
  - Done when: all endpoints return schema-valid responses and tests pass.

- [ ] Status: todo | Owner: Arun + Aniket (Frontend)
  - Integrate UI against current backend stubs.
  - Done when: topic flow can call generate and render questions.

- [ ] Status: todo | Owner: Jaggu (LLM)
  - Confirm output JSON format aligns with shared schemas.
  - Done when: sample outputs pass backend parsing with no field mismatch.

## Milestone 2: Real LLM Integration
- [ ] Status: todo | Owner: Jaggu (LLM)
  - Implement topic-based generation pipeline (no RAG).
  - Done when: backend receives valid quiz JSON for topic input.

- [ ] Status: todo | Owner: Jayaditya (Backend)
  - Replace mocked topic generation in service with LLM adapter call.
  - Add timeout/retry and fallback error mapping.
  - Done when: topic path works end-to-end via live LLM.

- [ ] Status: todo | Owner: Jayaditya + Jaggu
  - Add contract test for malformed LLM output.
  - Done when: backend rejects invalid shape with clear error response.

## Milestone 3: Document -> RAG -> LLM
- [ ] Status: todo | Owner: Jaggu (LLM)
  - Implement document ingestion/chunking/retrieval path.
  - Done when: document input yields grounded context and valid quiz output.

- [ ] Status: todo | Owner: Jayaditya (Backend)
  - Route `input_type=document` path to RAG pipeline adapter.
  - Done when: backend document mode returns quiz via RAG path.

- [ ] Status: todo | Owner: Arun + Aniket (Frontend)
  - Add document upload/input UI and response handling.
  - Done when: user can generate quiz from document input.

## Milestone 4: Persistence + Leaderboards
- [ ] Status: todo | Owner: Jayaditya (DB)
  - Create tables/migrations for users, quizzes, attempts, answers.
  - Create separate leaderboard tables:
    - beginner
    - intermediate
    - advanced
  - Done when: migrations apply cleanly and rollback safely.

- [ ] Status: todo | Owner: Jayaditya (Backend)
  - Replace in-memory leaderboard with DB-backed repository.
  - Persist score by difficulty table on submit.
  - Done when: restart-safe leaderboard data is available.

## Milestone 5: Insights + Evaluation Quality
- [ ] Status: todo | Owner: Jaggu (LLM)
  - Implement answer evaluation and strengths/weaknesses insights generation.
  - Done when: insights quality is consistent across difficulty levels.

- [ ] Status: todo | Owner: Jayaditya (Backend)
  - Persist evaluation summary and expose through submit response.
  - Done when: submit API returns score + structured insights reliably.

- [ ] Status: todo | Owner: Arun + Aniket (Frontend)
  - Render score, strengths, weaknesses, and recommendations clearly.
  - Done when: complete quiz-attempt summary UI is functional.

## Milestone 6: Testing + Hardening
- [ ] Status: todo | Owner: All
  - Add integration tests for both paths:
    - topic -> LLM -> quiz
    - document -> RAG -> LLM -> quiz
  - Done when: CI test suite catches contract and flow regressions.

- [ ] Status: todo | Owner: Jayaditya (Backend)
  - Standardize errors and add observability hooks.
  - Done when: failures are traceable and responses are consistent.

- [ ] Status: todo | Owner: Arun + Aniket (Frontend)
  - Add resilient UI states (loading, retry, partial failure).
  - Done when: no dead-end UX states on API/LLM errors.

## Milestone 7: Release Readiness
- [ ] Status: todo | Owner: All
  - Performance pass (latency, token usage, query speed).
  - Security pass (validation, limits, secrets handling).
  - UAT and final bugfix sweep.
  - Done when: release checklist is complete and monitored deployment is ready.

## Weekly Execution Cadence
- [ ] Daily: merge feature branches into `dev` after tests.
- [ ] Daily: 15-minute schema/interface sync between backend, frontend, and LLM.
- [ ] Daily: run one end-to-end smoke flow.
- [ ] Weekly: milestone review and reprioritization.

## Immediate Next Actions (This Week)
- [ ] Backend: swap topic mock with real LLM adapter.
- [ ] LLM: provide stable schema-compliant quiz output fixture set.
- [ ] Frontend: wire generate/submit flow against current backend endpoints.
- [ ] DB: draft migration plan for leaderboard and attempts tables.

## API Review Reference
- Backend endpoint handoff doc for team review: `docs/backend-endpoints.md`
- DB schema handoff doc for team review: `docs/db-schema.md`
