---
name: dev-analytics-stack
description: "Dev Analytics dashboard stack guide — FastAPI + asyncpg backend, Next.js 14 frontend, GitHub-API-fed Postgres warehouse, cron-triggered nightly collectors. Use when working in /Users/earnest/git/Dev_Analytics — adding new metrics, collectors, routers, or dashboard views."
---

# Dev Analytics Stack Guide

## Overview

The internal **Dev Analytics** dashboard at `localhost:3000/dev-analytics` is a productivity / DORA / AI-adoption scoreboard fed nightly from GitHub. The backend ingests commits, PRs, deployments, and incidents into a Postgres warehouse; the frontend renders metric cards, charts, and drill-in modals. Adding a new metric is a 4-layer change: **collector → ORM model → service → router → view**.

This is an internal tool used by Engineering Leadership at Degreed (Earnest's team) to compare team velocity, AI-Native adoption maturity, and (newly) code-health / AI-rot signals.

## Tech Stack

- **Backend**: Python 3.12, FastAPI 0.116, asyncpg 0.31, SQLAlchemy (async), Pydantic v2
- **Database**: PostgreSQL — local via Docker (`docker-compose.yml`), schema in `backend/migrations/*.sql`
- **Connection string**: `postgresql+asyncpg://devanalytics:localdev123@localhost:5432/dev_analytics`
- **Auth**: JWT (see `backend/migrations/004_auth_system.sql`), header `Authorization: Bearer <token>`
- **Frontend**: Next.js 14 (App Router), React 18, SWR 2 for fetching, Recharts for charts, Tailwind CSS for styling
- **Collectors**: Python scripts in `backend/scripts/`, triggered by cron via `POST /api/cache/refresh-all-internal` with `X-API-Key` header (see `CRON_SETUP.md`)
- **GitHub API**: REST v3, token in `GITHUB_TOKEN`, per-page 100, rate-limit-aware (see `sync_github_prs.py:43`)

## Repo Layout

```
Dev_Analytics/
├── backend/
│   ├── main.py                      # FastAPI app entry point, includes all routers
│   ├── database.py                  # AsyncSessionLocal + engine config
│   ├── models.py                    # SQLAlchemy ORM models (PullRequest, Repository, ...)
│   ├── dependencies.py              # JWT auth dependency
│   ├── migrations/                  # *.sql migrations, applied in numeric order
│   │   ├── 003_claude_analytics_tables.sql
│   │   ├── 004_auth_system.sql
│   │   ├── add_pr_detailed_data_cache.sql
│   │   └── create_teams_system.sql
│   ├── routers/                     # Route layer — one file per feature area
│   │   ├── auth.py
│   │   ├── org.py                   # Org-wide endpoints (incl. AI-Native maturity)
│   │   ├── dora.py
│   │   ├── claude_analytics.py
│   │   ├── claude_metrics.py
│   │   ├── teams.py
│   │   ├── team_activity.py
│   │   ├── pr_analysis.py
│   │   ├── pr_runs.py
│   │   ├── deployments.py
│   │   ├── incidents.py
│   │   ├── ai_insights.py
│   │   ├── internal.py              # Cache-refresh, internal-only
│   │   └── cache.py
│   ├── services/                    # Business logic — one file per feature area
│   │   ├── ai_native_service.py     # AI-Native maturity audit (RepoMaturityAudit)
│   │   ├── ai_authorship_service.py # PR-title / branch-prefix AI detection
│   │   ├── dora_service.py
│   │   ├── compounding_service.py
│   │   ├── insights_service.py
│   │   ├── team_service.py
│   │   ├── maturity_service.py
│   │   └── ...
│   └── scripts/                     # CLI collectors (one job per script)
│       ├── sync_github_prs.py       # PR-level data
│       ├── sync_pr_reviews.py       # Review comments (incl. AI-reviewer detection)
│       ├── sync_deployments.py
│       ├── sync_incidents.py
│       ├── sync_security.py
│       ├── sync_ai_native_inventory.py  # Scans .claude/, CLAUDE.md, scores quality
│       ├── sync_jira_teams.py
│       ├── discover_org.py
│       └── derive_incidents.py
├── frontend/
│   └── src/
│       ├── app/dev-analytics/
│       │   ├── page.tsx             # Entry; renders <Dashboard />
│       │   ├── layout.tsx
│       │   └── components/
│       │       ├── Dashboard.tsx    # ~5K lines; activeTab state switches views
│       │       ├── Sidebar.tsx      # Left nav, sections defined in NAV_SECTIONS
│       │       ├── MetricCard.tsx, CICDMetricCard.tsx, DORAMetricCard.tsx, ...
│       │       ├── ActivityChart.tsx, CycleTimeChart.tsx, ...
│       │       ├── DrilldownModal.tsx
│       │       ├── AINativeDeepDiveView.tsx
│       │       ├── RepoMaturityAuditView.tsx
│       │       ├── ClaudeMdDetailView.tsx
│       │       └── ... (~80 view/chart components)
│       ├── contexts/TeamContext.tsx # Global team + repo selection
│       └── config/apiConfig.ts      # NEXT_PUBLIC_API_BASE_URL + endpoint table
├── k8s/                             # Deployment manifests (not local-dev)
├── docker-compose.yml               # Local Postgres + backend
├── CRON_SETUP.md                    # Nightly collector orchestration
└── README.md
```

## Adding a New Metric — 4-Layer Recipe

When the user asks for a new metric or dashboard view, follow this exact recipe so the change matches existing patterns:

### 1. Schema migration (only if new persisted data)

- Create `backend/migrations/00N_<feature>_tables.sql` (sequential numeric prefix).
- Tables use `id BIGSERIAL PRIMARY KEY`, `created_at timestamptz default now()`, FK on `repo_id` referencing `repositories(id)`.
- Apply by running the SQL against local Postgres — there is **no migration framework**; migrations are tracked manually.
- Add the matching SQLAlchemy ORM model to `backend/models.py`.

### 2. Collector (only if new ingest)

- New script `backend/scripts/sync_<thing>.py`. Use `sync_github_prs.py` as the template — it has the canonical `gh_get()` rate-limit helper, `parse_gh_datetime()`, and `--repo / --all / --since` CLI args.
- Wrap I/O with `httpx.AsyncClient`. Always set `Authorization: token $GITHUB_TOKEN`. Always handle 403 + `x-ratelimit-reset` (sleep until reset).
- Write to DB via `AsyncSessionLocal()`. Use `bulk_save_objects()` or row-by-row `await session.merge()` depending on dedup needs.
- Wire into nightly cron by either adding to the existing `/api/cache/refresh-all-internal` orchestrator or by registering a new cron entry in `CRON_SETUP.md`.

### 3. Service

- New module `backend/services/<feature>_service.py`. Pattern: a single class (e.g., `class CodeHealthService:`) with `@staticmethod async def` methods, each returning a plain `dict` ready for JSON.
- Queries use `await session.execute(text("..."))` or SQLAlchemy ORM. Prefer `text(...)` for analytics queries (better visibility into the actual SQL).
- Cache via `dev_analytics_cache` table when computing is expensive — see `sync_ai_native_inventory.py` for the cache-write pattern.
- Thresholds and scoring weights live as module-level constants so they're tunable without a deploy.

### 4. Router

- New file `backend/routers/<feature>.py`. Use `APIRouter(prefix="/api/v2/org/<feature>", tags=["<feature>"])`.
- Add `Depends(get_current_user)` for auth (see `dependencies.py`).
- Register in `backend/main.py`: `app.include_router(<feature>.router)`.

### 5. Frontend view

- New component(s) under `frontend/src/app/dev-analytics/components/<feature>/`.
- Add nav entry to `Sidebar.tsx` (find `NAV_SECTIONS` / `ENGINEERING_LEADER_SECTIONS`). Each item is `{ id, label, icon, badge? }`.
- Add `activeTab` branch in `Dashboard.tsx` around the existing AI-Native section (line ~4819).
- Fetch via SWR with the env var:
  ```ts
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const fetcher = async (url) => {
    const token = sessionStorage.getItem("accessToken");
    const r = await fetch(`${API_BASE}${url}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return r.json();
  };
  ```
- Re-use `MetricCard`, `ActivityChart`, `CycleTimeChart`, `DrilldownModal`. Visual pattern reference: `RepoMaturityAuditView.tsx` for modal drill-ins, `AINativeDeepDiveView.tsx` for table-then-detail layouts.
- Team / repo context comes from `useTeamContext()` (no prop drilling).

## Conventions

- **Async everything** in backend — `async def` endpoints, `AsyncSession`, `httpx.AsyncClient`. Never block.
- **Datetime handling**: GitHub returns ISO-8601 with `Z`. Use `parse_gh_datetime()` from `sync_github_prs.py:79`. DB columns are offset-naive UTC (no `timezone=True`).
- **Naming**: snake_case Python, camelCase TypeScript, kebab-case CSS classes. Tab IDs in `Sidebar.tsx` are kebab-case (e.g., `ai-authorship`, `code-health`).
- **Logging**: `logging.getLogger(__name__)` in Python (see `sync_github_prs.py:32-37`). No `print()`. Frontend: `console.log` is fine in development.
- **Style tooling**: Python uses `ruff` (PEP 8 strict, snake_case). TypeScript uses Prettier + ESLint. Always run before committing.
- **Type strictness**: TS in strict mode. Python uses `mypy --strict` on critical modules (services). New code MUST type-hint.
- **Auth headers**: API is JWT-gated. Frontend reads token from `sessionStorage.accessToken` (set during login). Internal cache-refresh endpoint uses `X-API-Key` header instead.

## Running Locally

```bash
# Start Postgres
docker-compose up -d postgres

# Start backend
cd backend && uvicorn main:app --reload --port 8000

# Start frontend
cd frontend && npm run dev

# Trigger collectors manually
cd backend && python -m scripts.sync_github_prs --all --since 2026-01-01

# Test scoring locally
cd backend && python -c "from services.code_health_service import CodeHealthService; import asyncio; print(asyncio.run(CodeHealthService.rot_risk_score('degreed-coach-builder')))"
```

## Common Gotchas

- **`models.py` is the single source of truth** — every new table needs an ORM class here, even if the collector uses `text(...)` queries.
- **Frontend hot-reload sometimes drops the SWR cache** — restart Next.js if a metric stops updating after a backend change.
- **JWT expiry mid-session** — frontend will get 401; user must re-login. There is no refresh-token rotation.
- **GitHub rate-limit is shared org-wide** — heavy backfills (180-day commits across all repos) should run overnight. `gh_get()` will sleep until the reset header but the wait can be ~1h.
- **Migrations are unmanaged** — run them by hand against local Postgres. There is no Alembic. Track applied migrations in your head or via a deployment runbook.
- **`Dashboard.tsx` is ~5,000 lines** — it's a known structural smell. New tabs should be added there for consistency; no need to refactor the whole file in a feature PR.
- **`dev_analytics_cache` table** — used for slow-to-compute services (e.g., `ai_native_service.maturity_audit` reads from there). New services should follow this pattern when the compute is >1s.

## When NOT to use this skill

- Working in the *other* repos (Degreed, fe-workspace, degreed-coach-builder, degreed-assistant, degreed-flutter) — load the matching stack skill instead.
- Pure infrastructure / k8s / CI work — use a DevOps-focused skill.
- Modifying ai_native itself — that's meta-work, not Dev Analytics.
