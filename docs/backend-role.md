# Backend Engineering Role (Jayaditya)

## Role Summary
The backend engineer owns the API layer and overall orchestration of the system. This role turns product requirements into reliable server-side behavior, makes sure that API contracts are honored, and coordinates data and LLM interactions into a single, consistent flow.

## Core Ownership
- FastAPI endpoints and routing structure
- Request and response lifecycle, including validation
- Business logic for quiz flow and evaluation pipeline
- Integration points with LLM service and database layer
- Error handling, status codes, and observability hooks

## Responsibilities In Depth
1. **API Design and Contract Alignment**
   - Define or refine request/response shapes using the shared schemas as the source of truth.
   - Ensure every endpoint adheres strictly to schema constraints (types, required fields, enums).
   - Keep APIs stable and versioned when changes are necessary.

2. **Orchestration and Workflow Control**
   - Coordinate the step-by-step execution of a request (validate input, call LLM, persist results, return output).
   - Build clear boundaries between service layers to prevent tight coupling.
   - Maintain predictable flows for synchronous and async operations.

3. **Business Logic Implementation**
   - Implement scoring rules, grading logic, and evaluation criteria.
   - Enforce rules around quiz generation and attempt handling.
   - Prevent invalid state transitions in quiz/attempt workflows.

4. **Integration with LLM Service**
   - Create robust interfaces for LLM requests and structured outputs.
   - Handle retries, timeouts, and fallbacks where appropriate.
   - Validate LLM output against schemas before it touches downstream logic.

5. **Integration with Database Layer**
   - Use the DB access layer to persist and read quiz data, attempts, and metadata.
   - Ensure data is written transactionally where needed.
   - Maintain data consistency across flows.

6. **Validation and Error Handling**
   - Provide clear error messages and standardized error responses.
   - Detect and reject malformed requests early.
   - Enforce security-related checks (e.g., input limits, content validation).

7. **Documentation and Developer Experience**
   - Maintain OpenAPI/Swagger docs for all endpoints.
   - Keep API docs aligned with actual behavior.
   - Provide example requests and responses for consumers.

## Key Deliverables
- Stable, well-documented API endpoints
- Orchestrated end-to-end flow across frontend, LLM, and DB
- Reliable validation and error handling
- Business logic that matches product requirements

## Collaboration Touchpoints
- **Frontend**: Align on request/response shapes, errors, and state transitions.
- **LLM Engineer**: Define and enforce structured output contracts.
- **Database Engineer**: Ensure persistence needs and query capabilities are met.

## Success Criteria
- APIs follow shared schemas without drift
- Clear separation of responsibilities between layers
- End-to-end quiz flow works without brittle dependencies
- Errors are predictable and easy to debug
