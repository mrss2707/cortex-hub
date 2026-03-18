---
description: Start a new phase with automated gate checks and Forgewright pipeline
---

# /phase — Forgewright Phase Management

// turbo-all

## Usage

```
/phase N          # Start Phase N (checks Gate N-1→N first)
/phase N status   # Check Gate N-1→N without starting
```

## Steps

### 1. Read Gate Definitions
Read the gate criteria for the requested phase transition:
- File: `Antigravity-Production-Grade-Suite/.protocols/gate-definitions.md`
- Find the relevant gate (Gate N-1 → N)

### 2. Run Gate Checks
Execute each check command from the gate definition table.
For local checks:
- `turbo build` — must pass
- `turbo test` — must pass
- `turbo lint` — must be clean

For server checks (remote):
- SSH to `jackle@192.168.10.119` and run each health check command
- Example: `curl http://localhost:6333/healthz` (Qdrant)
- Example: `curl http://localhost:8317/` (CLIProxy)

### 3. Report Gate Results
Present gate results to user:
```
## Gate N-1→N Check Results

| Check | Status | Output |
|-------|--------|--------|
| Qdrant healthy | ✅ | OK |
| Neo4j healthy | ✅ | 200 OK |
| CLIProxy responding | ✅ | API info returned |
| ...

**Gate: PASSED ✅** — Ready to start Phase N.
```

If ANY check fails:
```
**Gate: FAILED ❌** — Cannot start Phase N.

Failed checks:
- [ ] mem0 health — Connection refused
  → Fix: `docker compose up -d mem0`
```

### 4. Enter DEFINE Step (if gate passed)
Follow the Phase Workflow Protocol:
- Read: `Antigravity-Production-Grade-Suite/.protocols/phase-workflow.md`
- Start DEFINE step:
  1. Read BRD (`product-manager/BRD/brd.md`) — find relevant epics
  2. Read Requirements Register — find R-codes for this phase
  3. Read Architecture Decisions — understand constraints
  4. Summarize what needs to be built

### 5. Proceed to PLAN Step
- Create implementation plan
- List files to create/modify/delete
- Define acceptance criteria
- **Request user approval** before proceeding to EXECUTE

### 6. After User Approves → EXECUTE → VERIFY → COMMIT
Follow the remaining workflow steps per `phase-workflow.md`:
- EXECUTE: Write code + tests
- VERIFY: `turbo build && turbo test && turbo lint`
- COMMIT: Conventional commit, update `AGENTS.md` phase status, update `task.md`

## Important Rules

- ❌ NEVER skip gate checks
- ❌ NEVER skip the PLAN step
- ❌ NEVER start EXECUTE before user approves the plan
- ✅ ALWAYS update `AGENTS.md` "Current Phase" after completing a phase
- ✅ ALWAYS update `task.md` checkboxes as work progresses
