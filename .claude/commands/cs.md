# /cs — Cortex Start v2.0

> Version: 2.0 | Updated: 2026-04-06
> Changelog: v2.0 — added task pickup, detect changes, recipe health, workflow recipes, versioning

Run ALL steps IN ORDER. Do NOT skip. Do NOT proceed to user work until Step 8 completes.

## Step 1: Session Start
Call `cortex_session_start`:
```
repo: "https://github.com/lktiep/cortex-hub.git"
mode: "development"
agentId: "claude-code"
ide: "<your IDE>"
branch: "<current git branch>"
```
Save `session_id` and `projectId` from the response — needed for all subsequent calls.
If `recentChanges.count > 0` → warn user and `git pull` before any edits.

## Step 2: Knowledge + Memory Recall (parallel)
Call BOTH in parallel:
- `cortex_knowledge_search(query: "session summary progress next session")`
- `cortex_memory_search(query: "session context decisions lessons", agentId: "claude-code")`

## Step 3: Conflict Check
Call `cortex_changes(agentId: "claude-code", projectId: "<from step 1>")`.

## Step 4: Task Pickup
Call `cortex_task_pickup()` to check for assigned tasks.
If tasks exist → list them with status. Ask user which to work on, or continue with their request.

## Step 5: Working State Check
Run `git status`. If uncommitted changes exist:
- Call `cortex_detect_changes(scope: "all")` to analyze risk level
- Report which symbols are affected and their blast radius

## Step 6: Recipe System Health
Call `GET /api/knowledge/recipe-stats` via the dashboard (or just note from session_start's `relevant_knowledge`).
If recipe pipeline has recent errors → flag to user.
If zero captures ever → note the system needs attention.

## Step 7: Situational Summary
Print a concise report:

```
## Session Init Complete
- **Last session**: <what was done>
- **Pending tasks**: <N tasks> or none
- **Unseen changes**: <from other agents> or clean
- **Working state**: clean / <N uncommitted files, risk level>
- **Recipe system**: active (<N> captures) / no captures yet / <N> errors
- **Key memories**: <relevant lessons>
- Ready to start work.
```

## Step 8: Activate Workflow Intelligence
For the REST of this session, follow these tool combos automatically:

### Before editing ANY file:
1. `cortex_code_search(query: "<what you're looking for>")` — find relevant code
2. `cortex_code_context(name: "<symbol>")` — understand callers/callees
3. `cortex_code_impact(target: "<symbol>")` — blast radius check
4. Only THEN edit

### Cross-project lookup (YulgangProject, etc.):
Use `repo:` parameter directly — NO need for `cortex_list_repos` or projectId:
```
cortex_code_search(query: "attack handler", repo: "YulgangProject")
cortex_code_context(name: "HandleAttack", repo: "YulgangProject")
cortex_code_read(file: "GameServer/Logic/NpcAttackLogic.cs", repo: "YulgangProject")
```

### When hitting an error:
1. `cortex_knowledge_search(query: "<error message>")` — check if known
2. `cortex_memory_search(query: "<error context>")` — check if seen before
3. Fix the error
4. If non-obvious → `cortex_knowledge_store(title: "<fix>", content: "<steps>")` — save for others

### Before committing:
1. `cortex_detect_changes(scope: "staged")` — verify blast radius
2. Commit
3. After push → `cortex_code_reindex(repo: "...", branch: "<branch>")`

### Working on a Conductor task:
1. `cortex_task_accept(taskId: "<id>")` at start
2. `cortex_task_update(taskId: "<id>", status: "in_progress")` during work
3. `cortex_task_update(taskId: "<id>", status: "completed", result: {...})` when done

---
All cortex gates satisfied. Proceed with user tasks.
