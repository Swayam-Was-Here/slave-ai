# SLAVE Test Suite

This repository includes a comprehensive, automated test suite that verifies the core functionality of the SLAVE execution engine.

## Running Tests

To run the full test suite from a clean state:

```bash
npm test
```

This command will:
1. Automatically set up a clean, isolated SQLite test database (`server/test.db`).
2. Spawn the Express backend locally on an ephemeral port.
3. Set `AI_FALLBACK=true` so the tests execute deterministically without requiring a real Gemini API key.
4. Execute the test phases sequentially.
5. Tear down the backend and clean up the test database.

**No manual database seeding or server startup is required to run the tests.**

## Test Coverage

The test suite is organized into phases corresponding to the core capabilities of SLAVE.

### Phase 3: Classification & Decision Engine (`server/test-phase3.js`)
- **Unit Tests:** Validates the deterministic rule engine (`decideAction`) directly against edge cases, LLM hallucinations, and vague inputs.
- **Integration Tests:** Creates full tickets and verifies the `analyze` and `decide` API routes correctly store their state in the database, generate an audit trail, and respect idempotency (duplicate calls do not corrupt state).

### Phase 4: Execution Engine (`server/test-phase4.js`)
- Validates the 4 core autonomous actions: `create_incident`, `escalate`, `resolve`, and `create_kb`.
- Ensures the execution engine correctly updates secondary database tables (`incidents`, `escalations`, `knowledge_articles`).
- Tests guardrails: rejecting executions on unclassified tickets and blocking unsupported or hallucinated action types (e.g., `self_destruct`).

### Phase 5: Complete E2E Automation (`server/test-phase5.js`)
- Tests the `/automate` endpoint which sequentially orchestrates Classification → Decision → Execution → Response Generation.
- Verifies that a final, contextual customer response is successfully generated and appended to the ticket after execution.
- Asserts the complete lifecycle (pending → running → completed) and the generation of a complete 5-step `audit_log` trail.
- Simulates the primary demo flow from end to end.

## Evaluator Notes

- **AI_FALLBACK**: The tests intentionally run with `AI_FALLBACK=true`. This simulates LLM behavior locally using predefined heuristics. This ensures the tests are extremely fast, deterministic, and will not fail due to network timeouts or missing API keys in CI/CD environments.
- **Isolation**: The tests use a disposable database (`server/test.db`). Running `npm test` will never mutate or destroy the primary production data in `server/slave.db`.
