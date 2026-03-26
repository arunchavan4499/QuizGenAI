# Database Engineering Role (Jayaditya)

## Role Summary
The database engineer owns the data model, persistence strategy, and query performance. This role ensures that the system has reliable storage, that data integrity is protected, and that query performance scales with usage.

## Core Ownership
- Database schema design and migrations
- Data integrity and constraints
- Query performance and indexing strategy
- Persistence patterns for quizzes, attempts, and leaderboards
- DB access layer stability

## Responsibilities In Depth
1. **Schema Design and Evolution**
   - Design schemas for users, quizzes, attempts, and leaderboard data.
   - Normalize data where appropriate while balancing performance needs.
   - Plan schema migrations that are reversible and safe.

2. **Migrations and Version Control**
   - Write and maintain migration scripts for schema changes.
   - Ensure migrations are repeatable and idempotent.
   - Coordinate migration timing with backend releases.

3. **Data Integrity and Constraints**
   - Enforce foreign keys, unique constraints, and validation rules.
   - Prevent inconsistent or orphaned records.
   - Define deletion and cascade rules that align with product needs.

4. **Query Optimization and Indexing**
   - Add indexes for high-traffic queries (quiz lookup, attempt retrieval).
   - Monitor query patterns and optimize slow paths.
   - Balance read vs. write performance based on usage.

5. **Access Layer and API Support**
   - Provide stable DB access patterns for backend services.
   - Ensure queries return the fields required by APIs.
   - Help define pagination or filtering strategies for large datasets.

6. **Reliability and Backup Planning**
   - Plan for backup and restore workflows.
   - Ensure data is resilient to failures where possible.
   - Define safe approaches to data cleanup or archiving.

7. **Analytics and Reporting Support**
   - Ensure data structures support evaluation insights and leaderboard views.
   - Provide aggregated query patterns if needed.

## Key Deliverables
- Stable schema and migration history
- Fast, reliable query performance
- Data integrity enforced across all flows
- DB access patterns that support backend logic

## Collaboration Touchpoints
- **Backend**: Align on schema usage, migrations, and query requirements.
- **LLM Engineer**: Support storage for prompt evaluation or analytics.
- **Frontend**: Provide data fields needed for UI display through the API.

## Success Criteria
- Schema changes do not break existing flows
- Queries remain fast as data grows
- Data integrity issues are rare and quickly diagnosed
- Migrations are predictable and safe
