# Cortex Hub — Agent Guidelines

> **Current Phase:** 6 (Polish, docs, testing, GA release)
> **Engagement:** Express | **Mode:** Greenfield → Brownfield
> **Last Gate Passed:** Gate 5 (Phase 5→6) on 2026-03-19

---

## Session Protocol (MANDATORY)

### At Session Start — ALWAYS do:

0. **Call `cortex_session_start`** → registers session with Cortex Hub, returns project context
   ```
   cortex_session_start({ repo: "<repo URL>", mode: "development" })
   ```
   Save the returned `sessionId` — needed for session close at end.
1. **Review Context** → check `recentMemories` from session start for project progress
2. **Read `.cortex/project-profile.json`** → `verify` commands & fingerprint
3. **Run `/onboard`** (only if first session or Hub credentials missing/broken) → sync MCP, rules, and local audit
4. **Acknowledge context:** "Phase X, resuming: [task]. Standards: SOLID, Clean Architecture. Verify: [profile commands]"

### At Session End — ALWAYS do:

1. **Run full verify** from `project-profile.json` → `verify.pre_commit`:
   - `pnpm build` **(FULL build, not --filter)**
   - `pnpm typecheck`
   - `pnpm lint`
2. **Report quality:** `Build ✅/❌ | Typecheck ✅/❌ | Lint ✅/❌`
3. **Store memory of progress** — call `cortex_memory_store` to record completed tasks and new decisions
4. **Commit** with conventional prefix: `feat:`, `fix:`, `docs:`, `chore:`
5. **Close session** — call `cortex_quality_report` with final gate status
6. **Store memories** — call `cortex_memory_store` for any new knowledge learned during the session (debugging findings, architecture decisions, deployment gotchas, etc.)

### During Session — Cortex Tool Integration (MANDATORY)

> ⚠️ **Agents MUST use Cortex tools throughout the session, not just at start/end.**
> These tools are the core value of Cortex Hub — skipping them defeats the purpose.
> ℹ️ **Compliance is enforced automatically** — see [Compliance Enforcement](#compliance-enforcement) below.

| When | Tool | What to Do |
|------|------|------------|
| **Searching code** | `cortex_code_search` | Use FIRST before `grep_search` or `find_by_name`. Queries GitNexus knowledge graph + Qdrant semantic search for actual source code snippets. Fall back to grep only if unavailable. |
| **Reading source files** | `cortex_code_read` | Read raw source code from indexed repos. Use after `cortex_code_search` to view full files. Supports line ranges. |
| **Understanding a symbol** | `cortex_code_context` | Get 360° view of a function/class: callers, callees, imports, process participation. |
| **Before editing core code** | `cortex_code_impact` | Run blast radius analysis on the symbol/file you plan to change. |
| **Before committing** | `cortex_detect_changes` | Detect uncommitted changes and assess risk level — shows affected symbols, processes, and risk rating. Use before `git commit`. |
| **Exploring code graph** | `cortex_cypher` | Run Cypher queries against the knowledge graph. Useful for: finding all callers of a function, listing classes by community, tracing dependency chains. |
| **Encountering an error/bug** | `cortex_knowledge_search` | **MANDATORY**: Search if this is a known bug or has a documented workaround before debugging from scratch. |
| **Fixing a new error/bug** | `cortex_knowledge_store` | **MANDATORY**: If you spend time fixing a frustrating or non-obvious bug, store the solution so other agents won't repeat your mistake. |
| **Recalling past context** | `cortex_memory_search` | Search agent memories for past decisions, debugging findings, and session context. |
| **Storing personal memory** | `cortex_memory_store` | Store session-specific findings, debugging gotchas, and workarounds for future recall. |
| **After pushing code changes** | `cortex_quality_report` | Report build/typecheck/lint results and a summary of changes. |
| **Measuring effectiveness** | `cortex_tool_stats` | View tool usage analytics: success rates, latency, token estimates. Available to all team members. |

**Tool priority order for discovery (before grep/find):**
1. `cortex_memory_search` → check if you or another agent already knows this
2. `cortex_knowledge_search` → search the shared knowledge base
3. `cortex_code_search` → search the indexed codebase (GitNexus AST + Qdrant semantic)
4. `cortex_code_read` → read full source files from indexed repos
5. `cortex_code_impact` → check blast radius before editing
6. `cortex_detect_changes` → pre-commit risk analysis
7. `cortex_cypher` → advanced graph queries (Cypher syntax)
8. `grep_search` / `find_by_name` → only if Cortex tools are unavailable

**Bug/Error Protocol (NEVER skip):**
If you encounter a compilation error, runtime error, or failing test:
1. First search `cortex_knowledge_search` or `cortex_memory_search` for the error message.
2. Fix the error.
3. If the fix was non-obvious, **YOU MUST** use `cortex_knowledge_store` to record the problem and solution so you (and others) don't have to debug it again.

### Compliance Enforcement (Automated)

Cortex Hub enforces tool usage through two mechanisms:

1. **Session Compliance Score** — When you call `cortex_session_end`, the system automatically evaluates your tool usage across 5 categories and shows a grade:
   - **Discovery** (code_search, code_read, code_context, cypher)
   - **Safety** (code_impact, detect_changes)
   - **Learning** (knowledge_search, memory_search)
   - **Contribution** (knowledge_store, memory_store)
   - **Lifecycle** (session_start, session_end, quality_report)

2. **MCP Response Hints** — Every tool response includes context-aware hints reminding you which tools to use next:
   - After `code_search` → reminder to check `code_impact` before editing
   - After `quality_report` → reminder to store knowledge/memory
   - Before `session_end` → reminder to report quality first

> 💡 These are enforced at the infrastructure level — they work on ANY MCP client (Antigravity, Claude, Cursor, etc.)

### Before Deploy — ALWAYS do:

Run `verify.full` from `project-profile.json`:
- All `pre_commit` commands + `pnpm test`
- ALL must pass before deploying

---

## Project Context

Cortex Hub is a self-hosted, MCP-compliant platform that unifies code intelligence, persistent memory, shared knowledge, and quality enforcement for AI coding agents. All backend services run in Docker, exposed via Cloudflare Tunnel.

### Tech Stack
- **Monorepo:** pnpm workspaces + Turborepo
- **MCP Gateway:** Hono (Node.js, Docker)
- **Dashboard API:** Hono + SQLite (Node.js)
- **Dashboard Web:** Next.js 15 + React 19
- **Backend:** Qdrant, mem9, GitNexus eval-server :4848 (Docker Compose)
- **Infra:** Cloudflare Tunnel, Watchtower

### Endpoints
| Service | URL |
|---------|-----|
| Dashboard | hub.jackle.dev |
| API | cortex-api.jackle.dev |
| MCP | cortex-mcp.jackle.dev |

---

## Routing Rules (Natural Language)

| User Pattern | Mode | Auto-Actions |
|-------------|------|-------------|
| "phase N" / "start phase N" / "bắt đầu phase N" | Phase Build | Read Memory State → gate check → DEFINE → PLAN → EXECUTE → VERIFY |
| "continue" / "tiếp" / "go" / "tiếp tục" | Resume | Read Memory State → resume task → EXECUTE → VERIFY |
| "add X" / "implement X" / "thêm X" / "làm X" | Feature | Read profile → PLAN → get approval → EXECUTE → VERIFY |
| "fix X" / "sửa X" / "debug X" | Debug | Locate issue → fix → run verify.pre_commit |
| "deploy" / "ship" / "đẩy lên" | Deploy | Run verify.full → deploy from profile → verify live |
| "onboard" / "setup" / "cài đặt" | Setup | Run scripts/onboard.sh or scripts/install-hub.sh |
| "review" / "check" / "kiểm tra" | Review | Run verify.full → check conventions → report |
| ANY other message in cortex-hub workspace | Session Init | `cortex_session_start` → Read Memory State → acknowledge context → then respond |

---

## Phase Roadmap & Gates

### Completed Phases
- [x] **Phase 1:** Server + Cloudflare Tunnel
- [x] **Phase 2:** Monorepo skeleton + shared packages
- [x] **Phase 3:** Docker stack (Qdrant, CLIProxy, Watchtower)
- [x] **Phase 4:** Hub MCP Server (Docker) — `apps/hub-mcp`
- [x] **Phase 5:** Dashboard Frontend (Next.js) — `apps/dashboard-web`

### Current Phase
- [/] **Phase 6:** Polish, docs, testing, GA release

### Gate Criteria

> ⚠️ **MANDATORY:** Before starting Phase N, Gate N-1→N MUST pass.
> Run `/phase N` or say "start phase N" to trigger automated gate checks.

| Gate | From → To | Required Checks |
|------|-----------|-----------------|
| Gate 1 | Phase 1→2 | Server accessible, Docker installed, Tunnel active |
| Gate 2 | Phase 2→3 | `turbo build` passes, shared packages compile, CI green |
| Gate 3 | Phase 3→4 | All Docker services healthy, CLIProxy API responding on :8317 |
| Gate 4 | Phase 4→5 | MCP tools respond via Worker, auth middleware works, logs written |
| Gate 5 | Phase 5→6 | Dashboard renders, setup wizard works, scoped API keys functional |

---

## Phase Workflow: DEFINE → PLAN → EXECUTE → VERIFY → COMMIT

```
DEFINE   → Read BRD epics + requirements for this phase
PLAN     → Create/update implementation plan, get user approval
EXECUTE  → Write code, follow code-conventions.md
VERIFY   → Run verify commands from project-profile.json
COMMIT   → Conventional commit, store memory
```

---

## Code Conventions

See: [.cortex/code-conventions.md](.cortex/code-conventions.md)

Key rules:
- **camelCase** for variables/functions, **PascalCase** for types/components
- **Path aliases** (`@cortex/*`) — never relative cross-package imports
- **Custom error classes** extending `CortexError`
- **Strict TypeScript** — no `any` without explicit comment
- **Co-located tests** — `foo.ts` → `foo.test.ts`

---

## Quality Gates

Every code session MUST end with verification from `project-profile.json`:

| Step | Command | Source |
|------|---------|--------|
| 1. Full Build | `pnpm build` | `verify.pre_commit[0]` |
| 2. Typecheck | `pnpm typecheck` | `verify.pre_commit[1]` |
| 3. Lint + Prettier | `pnpm lint` | `verify.pre_commit[2]` |
| 4. Test (deploy only) | `pnpm test` | `verify.full[3]` |

### Quality Score (per session)
| Dimension | Weight | Description |
|-----------|--------|-------------|
| Build | 25 | Code compiles, no errors |
| Regression | 25 | No existing tests broken |
| Standards | 25 | Follows code-conventions.md |
| Traceability | 25 | Changes linked to requirements |

---

## Key Documents

| Document | Path |
|----------|------|
| **Session Memory** | Auto-fetched by `cortex_session_start` |
| **Project Profile** | `.cortex/project-profile.json` (verify commands) |
| **Code Conventions** | `.cortex/code-conventions.md` |
| MCP Tool Reference | `docs/api/hub-mcp-reference.md` |
| Database ERD | `docs/database/erd.md` |
| Agent Quality Strategy | `docs/architecture/agent-quality-strategy.md` |
| Docker Stack | `infra/docker-compose.yml` |

---

## Never Do

- ❌ Start a new phase without passing the gate
- ❌ Skip the PLAN step (always get user approval before major code changes)
- ❌ Use `any` in TypeScript without explicit comment
- ❌ Commit without running verify commands from `project-profile.json`
- ❌ Edit infrastructure (Docker, Tunnel) without updating docs
- ❌ Ignore quality gate failures
- ❌ Hardcode verify commands — always read from `project-profile.json`


<!-- cortex-hub:auto-mcp -->
## Cortex Hub — Auto MCP (MANDATORY — every conversation)

At the START of every conversation, before doing anything else:

1. Call `cortex_session_start` with:
   ```
   repo: "https://github.com/lktiep/cortex-hub.git"
   mode: "development"
   agentId: "antigravity"
   ```
   This returns project context AND unseen code changes from other agents.

2. If `recentChanges.count > 0` in the response, warn the user and run `git pull` before editing any affected files.

3. Review `recentMemories` returned by `cortex_session_start` to understand current project progress and state.

### Before editing shared files

Call `cortex_changes` to check if another agent modified the same files:
```
agentId: "antigravity"
projectId: "<from session_start response>"
```

### When encountering an error or bug (MANDATORY)

1. First search `cortex_knowledge_search` or `cortex_memory_search` for the error message.
2. Fix the error.
3. If the fix was non-obvious, **YOU MUST** use `cortex_knowledge_store` to record the problem and solution so you (and others) don't have to debug it again.

### After pushing code

Call `cortex_code_reindex` to update code intelligence:
```
repo: "https://github.com/lktiep/cortex-hub.git"
branch: "<current branch>"
```

### Quality gates

Every session must end with verification commands from `.cortex/project-profile.json`.
Call `cortex_quality_report` with results.
Call `cortex_session_end` to close the session.

---

## ⚠️ Tool Usage Enforcement (MANDATORY)

> **You MUST use Cortex tools throughout the session. Skipping them defeats the purpose of Cortex Hub.**
> If any tool is missing or fails with `fetch failed`, immediately inform the user to refresh the MCP server connection.
> ℹ️ **Compliance is auto-enforced**: every tool response includes contextual hints, and `session_end` shows your compliance grade.

### Complete Tool Reference (17 tools)

| # | Tool | When to Use | Required Args |
|---|------|-------------|---------------|
| 1 | `cortex_session_start` | Start of EVERY conversation | `repo`, `agentId`, `mode` |
| 2 | `cortex_session_end` | End of EVERY session | `sessionId` |
| 3 | `cortex_changes` | Before editing shared files | `agentId`, `projectId` |
| 4 | `cortex_code_search` | **BEFORE** grep/find — use FIRST | `query`, optional `projectId` |
| 5 | `cortex_code_read` | Read raw source files from repos | `file`, `projectId`, optional `startLine`/`endLine` |
| 6 | `cortex_code_context` | Understand a symbol (callers, callees, flows) | `name`, optional `file` |
| 7 | `cortex_code_impact` | Before editing core code | `target` (function/class/file) |
| 8 | `cortex_detect_changes` | Before committing — pre-commit risk analysis | optional `scope`, `projectId` |
| 9 | `cortex_cypher` | Advanced graph queries (find callers, trace deps) | `query` (Cypher syntax) |
| 10 | `cortex_code_reindex` | After EVERY push | `repo`, `branch` |
| 11 | `cortex_memory_search` | Recall past decisions/findings | `query` |
| 12 | `cortex_memory_store` | Store session findings | `content` |
| 13 | `cortex_knowledge_search` | Search **FIRST** when encountering errors | `query` |
| 14 | `cortex_knowledge_store` | **MANDATORY**: Contribute bug fixes & patterns | `title`, `content` |
| 15 | `cortex_quality_report` | After running verify commands | `gate_name`, `results`, `agent_id` |
| 16 | `cortex_plan_quality` | Assess plan before execution | `plan`, `request` |
| 17 | `cortex_tool_stats` | View tool usage analytics & effectiveness | optional `days`, `agentId` |

### Tool Priority Order (MANDATORY — before grep/find)

1. `cortex_memory_search` → check if you already know this
2. `cortex_knowledge_search` → search shared knowledge base
3. `cortex_code_search` → search indexed codebase (GitNexus AST + Qdrant semantic)
4. `cortex_code_read` → read full source files from indexed repos
5. `cortex_code_impact` → check blast radius before editing
6. `cortex_detect_changes` → pre-commit risk analysis
7. `cortex_cypher` → advanced graph queries (Cypher syntax)
8. `grep_search` / `find_by_name` → fallback ONLY if Cortex tools unavailable

### Post-Push Checklist (NEVER skip)

```
1. pnpm build && pnpm typecheck && pnpm lint                    ← verify
2. cortex_quality_report(gate, passed, details, agent_id)       ← report (agent_id: "antigravity")
3. cortex_code_reindex(repo, branch)                            ← update code intelligence
4. cortex_memory_store(content, projectId)                      ← store findings
5. cortex_session_end(sessionId)                                ← close session
```

### Compliance Enforcement (Automated)

Your tool usage is **automatically tracked and scored**. Two mechanisms enforce compliance:

1. **Session Compliance Score** — `cortex_session_end` returns a grade (A/B/C/D) based on tool category coverage:
   - Discovery (code_search, code_read, code_context, cypher)
   - Safety (code_impact, detect_changes)
   - Learning (knowledge_search, memory_search)
   - Contribution (knowledge_store, memory_store)
   - Lifecycle (session_start, session_end, quality_report)

2. **MCP Response Hints** — Every tool response includes adaptive hints about what to use next.

> 💡 These are infrastructure-level enforcement — they work on ANY MCP client.

### Tool Verification

If you see fewer than 17 tools from `cortex-hub` MCP server, the connection may be stale.
**Action:** Immediately inform the user: "MCP tools are incomplete. Please refresh the cortex-hub MCP server connection."
<!-- cortex-hub:auto-mcp -->
