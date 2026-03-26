# Team Roles and Collaboration Guide

## Overview

This project is structured to allow parallel development across four distinct domains: backend, LLM services, frontend, and database. Each member owns a clear boundary to minimize conflicts and maximize velocity.

---

## Roles & Responsibilities

### Jayaditya — Backend Engineer

Owns the API layer and system orchestration.

**Responsibilities:**

* Design and implement API endpoints (FastAPI)
* Handle request/response lifecycle
* Integrate with LLM service and DB layer
* Implement business logic (quiz flow, evaluation pipeline)
* Ensure validation and error handling

**Delivers:**

* Stable APIs
* OpenAPI/Swagger docs

---

### Jaggu — LLM / AI Engineer

Owns all LLM-related logic and RAG pipeline.

**Responsibilities:**

* Prompt engineering and optimization
* RAG pipeline (chunking, embeddings, retrieval)
* Ensure structured outputs (strict JSON schemas)
* Optimize latency and cost
* Handle model integrations (local/cloud)

**Delivers:**

* Reliable LLM responses
* Quiz generation logic
* Evaluation insights

---

### Arun + Aniket — Frontend Engineer

Owns the user interface and client-side logic.

**Responsibilities:**

* Build UI components (React)
* Integrate APIs
* Manage state and user flows
* Handle quiz rendering and interactions
* Ensure responsive design and UX clarity

**Delivers:**

* Functional UI
* Smooth user experience

---

### Jayaditya — Database Engineer

Owns data modeling, persistence, and performance.

**Responsibilities:**

* Design schema (users, quizzes, attempts, leaderboard)
* Write migrations
* Optimize queries and indexing
* Maintain data integrity
* Provide DB access layer

**Delivers:**

* Stable schema
* Efficient queries

---

## Collaboration Practices

### 1. API Contract First

* Define request/response schemas in `/shared/schemas`
* Backend and frontend must strictly follow these
* LLM outputs must conform to schema

---

### 2. Branching Strategy

* `main` → stable
* `dev` → integration
* `feature/<name>` → individual work

Rules:

* No direct commits to `main`
* PR required for merge

---

### 3. Daily Integration

* Each member pushes to their feature branch
* Merge into `dev` after testing
* Resolve conflicts early (not at the end)

---

### 4. Ownership Boundaries

* Do not modify another module without discussion
* Use clear interfaces instead of tight coupling

---

### 5. Testing Responsibility

* Backend: API tests
* LLM: output validation
* Frontend: UI + integration checks
* DB: query correctness

---

### 6. Communication Protocol

* Blockers must be raised immediately
* Define interfaces before implementation
* Avoid assumptions across modules

---

## Minimum Working Flow (Milestone 1)

```
User → Frontend → Backend → LLM → Backend → Frontend
```

Goal:

* One topic input
* One response output
* No broken links between layers

---

## Expected Standard

A successful implementation should:

* Have zero ambiguity in ownership
* Allow independent development without blocking
* Maintain strict API and schema discipline
* Deliver one complete end-to-end flow early

---

## Key Principle

Loose coupling, strict contracts.

If this is followed, the system scales. If not, integration will fail.
