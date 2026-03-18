# Architecture Decision Records — Cortex Hub

> Decisions made during Phases 1–3. Referenced by `AGENTS.md`.

---

## ADR-001: Monorepo with pnpm + Turborepo

**Date:** 2026-03-18 | **Status:** Accepted | **Phase:** 2

**Context:** Need to manage 3 apps + 3 shared packages with consistent tooling.

**Decision:** pnpm workspaces for dependency management, Turborepo for task orchestration.

**Rationale:**
- pnpm's strict node_modules prevents phantom dependencies
- Turborepo provides build caching, task parallelization, and dependency-aware ordering
- Path aliases (`@cortex/*`) provide clean cross-package imports

**Consequences:** All packages must be referenced via workspace protocol in `package.json`. Cross-package imports use path aliases only.

---

## ADR-002: Cloudflare Worker for MCP Gateway

**Date:** 2026-03-18 | **Status:** Accepted | **Phase:** 2

**Context:** MCP gateway needs to be always-available, low-latency, and globally accessible.

**Decision:** Use Cloudflare Worker (Hono framework) as the MCP gateway endpoint.

**Rationale:**
- Serverless = zero ops for the gateway layer
- Cloudflare has built-in MCP server support
- Hono is lightweight and Worker-native
- Free tier: 100K requests/day

**Consequences:** Gateway cannot access local Docker services directly — must proxy through Cloudflare Tunnel to server-hosted APIs.

---

## ADR-003: Docker Compose for Backend Services

**Date:** 2026-03-18 | **Status:** Accepted | **Phase:** 3

**Context:** Need Qdrant, Neo4j, mem0 running on the self-hosted server.

**Decision:** Docker Compose with named volumes, health checks, and `depends_on` conditions.

**Rationale:**
- Single `docker compose up -d` deploys entire backend
- Named volumes persist data across container restarts
- Health checks + depends_on ensure proper startup order
- Watchtower provides automatic image updates

**Consequences:** Server must have Docker installed. Memory allocation must be carefully planned (~4.5GB total).

---

## ADR-004: CLIProxy over LiteLLM

**Date:** 2026-03-18 | **Status:** Accepted | **Phase:** 3

**Context:** Need an OpenAI-compatible proxy to route LLM requests from mem0 and other services.

**Decision:** Use CLIProxy (`eceasy/cli-proxy-api`) instead of LiteLLM.

**Rationale:**
- **Lightweight:** 256M RAM vs LiteLLM's 768M+
- **Zero dependencies:** No PostgreSQL, no Redis, no Prisma
- **OAuth-native:** Login with ChatGPT/Gemini/Claude subscriptions — no API key required
- **Simple config:** Single YAML file + auth volume

**Alternatives considered:**
- LiteLLM: Heavier, requires PostgreSQL for database mode, Redis for caching. Tested and rejected — crashed due to missing Redis, required 768M memory.
- Direct API keys: No proxy. Rejected — tightly couples services to specific providers.

**Consequences:** CLIProxy uses port 8317 (not the standard OpenAI 443). All services set `OPENAI_API_BASE=http://llm-proxy:8317/v1`.

---

## ADR-005: SQLite WAL for Dashboard API

**Date:** 2026-03-18 | **Status:** Accepted | **Phase:** 2

**Context:** Dashboard API needs a database for sessions, API keys, quality reports, logs.

**Decision:** SQLite in WAL mode with `better-sqlite3` driver.

**Rationale:**
- Zero-ops: no external database server
- WAL mode supports concurrent reads + single writer
- Sufficient for single-admin self-hosted scenario
- Easy backup: copy one file

**Migration path:** If multi-user support is added later, can migrate to PostgreSQL.

**Consequences:** Database file stored in Docker named volume. Schema managed via migration files.
