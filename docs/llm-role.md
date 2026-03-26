# LLM / AI Engineering Role (Jaggu)

## Role Summary
The LLM engineer owns all model-facing logic, ensuring that the system produces consistent, structured, and cost-effective outputs. This role turns product intent into prompt and retrieval strategies, validates output rigorously, and tunes for reliability.

## Core Ownership
- Prompt design and optimization
- Retrieval-augmented generation (RAG) pipeline
- Structured JSON outputs and schema alignment
- Model integrations across local and cloud providers
- Performance, latency, and cost control

## Responsibilities In Depth
1. **Prompt Engineering and Control**
   - Create prompts that are stable, clear, and consistent.
   - Reduce ambiguity and hallucinations through precise instructions.
   - Iterate on prompt structure to improve reliability and grading accuracy.

2. **RAG Pipeline Design**
   - Implement chunking strategy and embedding configuration.
   - Manage retrieval logic (top-k, filters, reranking).
   - Ensure grounding sources are used effectively by the model.

3. **Structured Output Enforcement**
   - Ensure LLM outputs follow strict JSON schemas defined in shared contracts.
   - Implement output validation and correction strategies.
   - Define guardrails to prevent malformed or missing fields.

4. **Model Integration and Provider Strategy**
   - Configure providers (local or cloud) based on quality and cost constraints.
   - Maintain a unified interface to swap models if needed.
   - Handle provider-specific quirks and rate limits.

5. **Reliability and Quality Control**
   - Track correctness of quiz generation and evaluation results.
   - Maintain prompt tests or golden samples to prevent regressions.
   - Tune for consistent response formats under varied inputs.

6. **Latency and Cost Optimization**
   - Reduce token usage via prompt trimming and efficient context windows.
   - Set timeouts and fallback paths for slow responses.
   - Measure and optimize for cost at scale.

7. **Evaluation Insights**
   - Provide feedback loops to improve question quality and scoring accuracy.
   - Define metrics for LLM output health (schema pass rate, coverage).

## Key Deliverables
- Reliable and schema-compliant LLM outputs
- Working RAG pipeline that improves question relevance
- Prompt and retrieval strategies documented and repeatable
- Cost and latency within acceptable thresholds

## Collaboration Touchpoints
- **Backend**: Align on schema constraints, validation rules, and retry handling.
- **Frontend**: Provide predictable data shapes for rendering and UX flows.
- **Database**: Ensure storage strategy supports prompt evaluation or analytics.

## Success Criteria
- Output schema pass rates stay high under real traffic
- Quiz generation is relevant, diverse, and on-topic
- Latency is controlled without degrading quality
- Model swaps do not break output structure
