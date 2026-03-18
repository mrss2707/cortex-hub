# Gate Definitions — Cortex Hub

> Each gate MUST pass before entering the next phase.
> Run `/phase N` to automatically check Gate N-1→N.

---

## Gate 1: Phase 1→2 (Server → Monorepo)

**Status:** ✅ Passed (2026-03-18)

| Check | Command | Expected |
|-------|---------|----------|
| Server SSH accessible | `ssh jackle@192.168.10.119 hostname` | Returns hostname |
| Docker installed | `docker --version` | Docker 24+ |
| Node.js installed | `node --version` | Node 22+ |
| pnpm installed | `pnpm --version` | pnpm 10+ |
| Cloudflare Tunnel active | `systemctl status cloudflared` | Active (running) |

---

## Gate 2: Phase 2→3 (Monorepo → Docker Stack)

**Status:** ✅ Passed (2026-03-18)

| Check | Command | Expected |
|-------|---------|----------|
| Turbo build passes | `turbo build` | All tasks successful |
| Shared packages compile | `turbo build --filter=@cortex/shared-types --filter=@cortex/shared-utils` | 2/2 success |
| TypeScript strict clean | `turbo typecheck` | No errors |
| Lint passes | `turbo lint` | No errors |
| pnpm install clean | `pnpm install` | No errors |

---

## Gate 3: Phase 3→4 (Docker Stack → MCP Server)

**Status:** ⏳ Pending verification

| Check | Command | Expected |
|-------|---------|----------|
| Qdrant healthy | `curl http://localhost:6333/healthz` | Returns OK |
| Neo4j healthy | `curl http://localhost:7474` | Returns web UI |
| CLIProxy responding | `curl http://localhost:8317/` | Returns API info JSON |
| mem0 accessible | `curl http://localhost:8050/health` | Returns 200 |
| Docker stack stable | `docker ps --filter name=cortex` | All containers "Up" |
| Turbo build still passes | `turbo build` (local) | All tasks successful |
| Turbo test still passes | `turbo test` (local) | All tests pass |

**Rollback:** If gate fails, fix Docker issues before proceeding. Do NOT start Phase 4 with unhealthy backend services.

---

## Gate 4: Phase 4→5 (MCP Server → Dashboard Frontend)

**Status:** 🔲 Not yet applicable

| Check | Command | Expected |
|-------|---------|----------|
| MCP endpoint responds | `curl https://mcp.hub.jackle.dev/` | Returns MCP capabilities |
| Auth middleware works | `curl -H "Authorization: Bearer invalid" https://mcp.hub.jackle.dev/` | Returns 401 |
| code.search tool works | MCP call `code.search({query: "test"})` | Returns results |
| memory.store tool works | MCP call `memory.store({content: "test"})` | Returns success |
| Tool call logging works | Check Dashboard API logs after tool call | Structured log entry present |
| Turbo build passes | `turbo build` | All tasks successful |
| Turbo test passes | `turbo test` | All tests pass |

**Rollback:** If auth or routing broken, revert Worker code. Backend services should not be affected.

---

## Gate 5: Phase 5→6 (Dashboard Frontend → Polish & GA)

**Status:** 🔲 Not yet applicable

| Check | Command | Expected |
|-------|---------|----------|
| Dashboard loads | `curl https://hub.jackle.dev` | Returns HTML |
| Setup wizard renders | Visit hub.jackle.dev first time | Wizard flow appears |
| API key creation works | Create key via Dashboard UI | Key generated, usable with MCP |
| Scoped permissions work | Create scoped key, test restricted access | Scope enforced |
| Real-time logs stream | Trigger tool call, check logs screen | Log appears within 2s |
| All tests pass | `turbo test` | 70%+ coverage |
| All lints pass | `turbo lint` | Zero errors |

**Rollback:** Frontend issues don't affect backend. Safe to iterate.

---

## Running Gates

Gates can be checked manually or via AWF:

```bash
# AWF command (recommended)
/phase 4    # Checks Gate 3, then enters Phase 4 DEFINE step

# Manual check (any single gate)
# Run each command in the gate table above
```
