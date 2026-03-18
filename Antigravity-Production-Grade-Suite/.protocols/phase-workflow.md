# Phase Workflow Protocol — Cortex Hub

> Every phase follows the same 5-step flow. No exceptions.

---

## Flow: DEFINE → PLAN → EXECUTE → VERIFY → COMMIT

### Step 1: DEFINE
**Goal:** Understand what this phase must deliver.

Actions:
1. Read the BRD (`product-manager/BRD/brd.md`) — identify relevant epics
2. Read the Requirements Register — identify R-codes for this phase
3. Read the BA Handoff Package — check feasibility notes
4. Read Architecture Decisions — understand constraints and prior decisions
5. Summarize: what must be built, which requirements are addressed

Output: A clear problem statement + list of requirements to implement.

### Step 2: PLAN
**Goal:** Get user approval before writing code.

Actions:
1. Create an implementation plan (artifact: `implementation_plan.md`)
2. List all files to create/modify/delete
3. Define acceptance criteria (from BRD + requirements)
4. Identify risks and dependencies
5. **Request user review via `notify_user`** — WAIT for approval

Output: Approved implementation plan.

> ⚠️ **NEVER skip PLAN.** Always get user approval before major code changes.

### Step 3: EXECUTE
**Goal:** Write the code.

Actions:
1. Follow the approved implementation plan
2. Adhere to `.forgewright/code-conventions.md`
3. Update `task.md` as items complete
4. Write tests alongside code (co-located: `foo.ts` → `foo.test.ts`)
5. If unexpected complexity found → return to PLAN, update plan, request re-approval

Output: Working code + tests.

### Step 4: VERIFY
**Goal:** Prove the code works.

Actions:
1. Run `turbo build` — must pass
2. Run `turbo test` — must pass
3. Run `turbo lint` — must be clean
4. Run service-specific health checks (if applicable)
5. Verify acceptance criteria from the BRD
6. Run `gitnexus_detect_changes()` if code indexed — confirm change scope is expected

Output: All checks green + acceptance criteria met.

### Step 5: COMMIT
**Goal:** Ship the phase and record progress.

Actions:
1. Commit with conventional prefix: `feat:`, `fix:`, `chore:`, `docs:`
2. Update `task.md` — mark phase items as `[x]`
3. Update `AGENTS.md` — advance "Current Phase" and "Last Gate Passed"
4. Update `.forgewright/project-profile.json` — increment `total_sessions`
5. Create/update `walkthrough.md` with what was accomplished

Output: Clean commit + updated progress tracking.

---

## Quick Reference

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  DEFINE  │───▶│   PLAN   │───▶│ EXECUTE  │───▶│  VERIFY  │───▶│  COMMIT  │
│          │    │          │    │          │    │          │    │          │
│ Read BRD │    │ Write    │    │ Write    │    │ Build ✓  │    │ git add  │
│ Read Reqs│    │ impl plan│    │ code     │    │ Test ✓   │    │ Update   │
│ Read ADRs│    │ Get OK   │    │ + tests  │    │ Lint ✓   │    │ AGENTS   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                     ▲                │
                     │   complexity   │
                     └────────────────┘
```
