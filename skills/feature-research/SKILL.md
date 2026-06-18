---
name: feature-research
description: "Deep cross-repo research for a Jira ticket or feature — scans all 5 workspace repos for impact, maps dependencies, checks Datadog baselines, finds related tickets, and produces a research document. Use when investigating a feature, bug, or any ticket that needs thorough analysis before implementation."
---

# Feature Research — Deep Cross-Repo Analysis

Perform comprehensive research across all workspace repositories to understand the full impact of a feature or bug fix.

## Mandatory Verification — Hallucination Prevention

**Every research agent's first 3 tool calls per cited file path MUST include `git ls-tree HEAD <path>`** (or `git -C <repo> ls-tree HEAD <path>` for sub-repos). Findings citing files, columns, migrations, classes, or functions that have NOT been verified against `git ls-tree HEAD` are **auto-rejected by the Phase 1 critic**.

Rules:
- If you cite a column, table, migration, function, or class — verify with `git show {branch}:{path}` first.
- Cite the verified line numbers (`{path}:{line}`), not approximate locations.
- `__pycache__` or working-tree remnants from prior branch checkouts can mislead — **always cross-check against `git ls-tree HEAD`** before treating a file as a citation.
- If the source is on a feature branch (not `main`), say so explicitly: "Source on `feature/AIDATASCI-4552-ask-maestro` — verify with `git show feature/AIDATASCI-4552-ask-maestro:{path}` because this is NOT on main."
- Phase 1 critic will spot-check 3 random citations with `git ls-tree HEAD` — failures = BLOCKED verdict.

## Constants

```
JIRA_CLOUD_ID = "151636d7-9099-4803-a108-4f053f36c9fe"
WORKSPACE_ROOT = "<your-workspace-root>"  # e.g., /Users/you/Downloads/maestro_repo_ai_native
```

## Instructions

### 1. Gather Context

If coming from the `feature-builder` pipeline, you already have requirements from Phase 0. Otherwise:
- If a Jira ticket ID is provided, fetch it via `mcp__atlassian__getJiraIssue`
- If a description is provided, use it directly
- Extract keywords, feature names, API paths, component names for searching

### 1.1 All-Layer Checklist

**EVERY research MUST cover ALL layers that the feature touches.** Don't stop at the layer the ticket mentions — trace the full vertical.

```markdown
## Layer Coverage Checklist
| Layer | In Scope? | What to Research |
|-------|----------|-----------------|
| **UI — Angular (fe-workspace)** | {Yes/No} | Components, routes, services, Apollo components, i18n, a11y |
| **UI — Flutter (degreed-flutter)** | {Yes/No} | Cubits, screens, models, navigation |
| **UI — Design** | {Yes/No} | Figma mockup status, Apollo availability, visual preview needed |
| **Design — Figma MCP** | {Yes/No} | If URL exists, pull design context via `mcp__plugin_figma_figma__*` (Section 1.3). Mandatory for any FE feature with a Figma source. |
| **API — .NET (Degreed)** | {Yes/No} | Controllers, orchestrators, DTOs, routes, auth |
| **AI — Python (degreed-coach-builder)** | {Yes/No} | Endpoints, prompts, strategies, RAG, voice |
| **AI — DGA (degreed-assistant)** | {Yes/No} | Tools, chains, scopes |
| **AI — LLM Behavior** | {Yes/No} | Prompt changes, function calling, system instructions |
| **Database** | {Yes/No} | Tables, SPs, migrations, data model changes |
| **Redis / Session** | {Yes/No} | SessionDataModel fields, TTL, cache strategy |
| **Infrastructure** | {Yes/No} | Feature flags, config changes, deployment order |
```

For EACH layer marked "Yes", the research MUST include:
- What exists today (current state)
- What needs to change (proposed changes)
- What could break (risk assessment)

### 1.2 Existing Pattern Inventory (MANDATORY before any architecture proposal)

**This is the most important section of research.** Before suggesting a new approach, you MUST find and document **3+ similar features already implemented** in this codebase. The goal is to ground the architecture in how this codebase ALREADY solves analogous problems — not to invent new patterns from first principles.

**Why this matters:** the implementer downstream will follow these patterns. If research hands them an approach that doesn't fit existing conventions, drift starts at Phase 3 and compounds through the rest of the pipeline.

**Required output (goes into the research doc):**

```markdown
## Existing Pattern Inventory

### Similar feature 1: {name}
- **Location:** `path/to/file.cs:line`
- **What it does:** {1 sentence}
- **Pattern shape:** {e.g. "Strategy pattern — Coach/Roleplay/Quiz each implement IPromptStrategy"}
- **What we'd reuse:** {existing service / component / type / fragment}
- **What's different about our feature:** {only the parts that genuinely diverge}

### Similar feature 2: {name}
{same structure}

### Similar feature 3: {name}
{same structure}

### Pattern verdict
- **Strongest precedent:** {feature N — because Y}
- **Pattern to follow:** {explicit name + reference}
- **Where we MUST diverge from this pattern:** {list with justification, or "nowhere"}
- **Reuse opportunities:** {existing code we hook into rather than rebuild}
```

**How to find similar features:**
1. Grep for keywords from the requirement (e.g. for a "summary" feature → grep for `summary`, `Summary`, `summarize`)
2. Look at the **same layer** of related features (Coach summary → look at quiz summary, roleplay summary, forms summary)
3. Look at the **build tracker history** in `docs/builds/` for past pipelines on similar Epics
4. Check `claude-mem` for past pipeline runs in this domain area

**If you genuinely cannot find 3 precedents** (truly novel feature), document this explicitly: "no precedents — closest analogs are X, Y; we are diverging because Z." Do NOT skip this section. The exception must be argued.

**This inventory feeds directly into Phase 2 (ADR + Detailed Implementation Plan).** The plan template's "Existing Pattern Citations" section pulls from here.

### 1.2 Ask Clarifying Questions

**If anything is unclear or ambiguous, ASK — don't guess.**

Before diving into deep research, check if you need clarification on:

```markdown
Questions to ask the user (if applicable):
- "The ticket mentions UI changes but no Figma. Do you have a design? Or should I propose a layout?"
- "This feature touches {repo} — should it also work on mobile (Flutter)?"
- "The requirement says '{vague statement}' — does that mean {interpretation A} or {interpretation B}?"
- "The existing API returns {shape}. Should the new feature extend it or create a new endpoint?"
- "This overlaps with {existing feature}. Should we integrate or keep separate?"
- "Are there specific performance targets? (e.g., response time under Xms)"
```

**Ask ALL unclear questions at once** — don't trickle them one by one. Present them as a batch at the start of the research phase, then proceed with what you can while waiting for answers.

### 1.3 Design Context Discovery (MANDATORY when Figma URL exists)

**If a Figma URL was captured at intake (Phase 0), pull the design context NOW during research — don't defer to implementation time.** Doing it during research surfaces Apollo gaps, hidden states, and component reuse opportunities BEFORE the ADR locks in an approach.

**Required prerequisite skills (load BEFORE any tool call):**
- `figma:figma-use` — required before any `mcp__plugin_figma_figma__*` write call
- `figma:figma-implement-design` — required before mapping designs to code

**Tool sequence (parallel where possible):**
```
mcp__plugin_figma_figma__get_design_context({fileKey, nodeId})  # primary — code + screenshot + tokens + Code Connect
mcp__plugin_figma_figma__get_screenshot({fileKey, nodeId})      # canonical visual reference
mcp__plugin_figma_figma__get_variable_defs({fileKey, nodeId})   # design tokens
mcp__plugin_figma_figma__get_code_connect_map({fileKey, nodeId})# component → code mappings
mcp__plugin_figma_figma__get_metadata({fileKey, nodeId})        # node hierarchy
```

**Save artifacts** to `docs/builds/{EPIC-ID}-design/`:
- `figma-screenshot.png`
- `figma-tokens.json`
- `figma-code-connect.json`
- `figma-context.md` — extracted layout, components, states

**Capture in the research doc (Section 10 — UI & Design Layer):**
- All UI states visible in Figma (default, hover, focus, loading, error, empty, disabled)
- Spacing scale and typography tokens used (map to Apollo tokens)
- Component types and whether each has an Apollo/Fresco equivalent
- Code Connect mappings — these are the SOURCE OF TRUTH; never re-implement a mapped component
- Design fidelity risks (e.g., "design uses spacing 14px which doesn't exist in Apollo's 4-px scale")

**Add a new row to the impact matrix:**
| Layer | In Scope? | What to Research |
|-------|----------|-----------------|
| **Design — Figma** | Yes (URL: {url}) | Design tokens via MCP, Apollo gaps, Code Connect mappings, all visible states |

**If no Figma URL exists**, skip this section but note "no design source — design system skill must generate preview at implementation time" in the research doc.

### 2. Cross-Repo Impact Scan

For each requirement/keyword, search ALL repos systematically. **Launch parallel agents for each repo** — don't scan them one by one.

**Parallel scan pattern — send ALL of these in a single message:**
```python
Agent({ description: "Scan coach-builder", model: "opus",
        prompt: "Search degreed-coach-builder for {keywords}. Read affected files deeply..." })
Agent({ description: "Scan Degreed .NET",   model: "opus",
        prompt: "Search Degreed/ for {keywords}. Read controllers, orchestrators..." })
Agent({ description: "Scan fe-workspace",   model: "opus",
        prompt: "Search fe-workspace for {keywords}. Read components, services..." })
Agent({ description: "Scan flutter",        model: "opus",
        prompt: "Search degreed-flutter for {keywords}. Read cubits, services..." })
Agent({ description: "Scan assistant",      model: "opus",
        prompt: "Search degreed-assistant for {keywords}. Only if DGA in scope..." })
```

Each agent uses `model: "opus"` (Claude Opus 4.6, 1M context) so it can read entire files, not just grep for matches. The agent should READ the affected files and understand what they do, not just list paths.

#### 2.1 degreed-coach-builder (Python Maestro)

Search these key areas:

| Area | Path | What to Look For |
|------|------|-----------------|
| API endpoints | `backend/app/api/` | New/modified routes, request/response models |
| LLM/Prompts | `backend/app/llm/` | Prompt changes, strategy modifications |
| Voice agents | `backend/app/realtime/` | Agent changes, LiveKit integration |
| Quiz pipeline | `backend/app/quiz/` | Quiz generation, validation, dedup |
| Post-processing | `backend/app/post_process/` | Extraction types, processing pipeline |
| RAG | `backend/app/rag/` | Document processing, vector search |
| .NET callbacks | `backend/app/dg_component/api_service/` | EndpointRegistry, DegreedApiService |
| Session/Redis | `backend/app/db/redis_manager.py` | SessionDataModel changes |
| Security | `backend/app/utils/security_validation.py` | Auth, access checks |
| Tests | `backend/tests/` | Existing test coverage |

Search commands:
```bash
# Search for feature keywords
grep -r "{keyword}" degreed-coach-builder/backend/app/ --include="*.py" -l
# Search for specific endpoint patterns
grep -r "/{path}" degreed-coach-builder/backend/app/api/ --include="*.py"
```

#### 2.2 Degreed (.NET Backend)

| Area | Path | What to Look For |
|------|------|-----------------|
| Controllers | `trunk/Degreed.Web.vNext/Controllers/Api/` | CoachController, MaestroController, QuizController |
| Orchestrators | `trunk/Degreed.Common.Standard/Orchestrators/` | CoachOrchestrator, DegreedAssistantOrchestrator |
| Route constants | `trunk/Degreed.Common.Standard/Constants/CoachAIBackendRoutes.cs` | Route definitions |
| HTTP clients | `trunk/Degreed.Common.Standard/DependencyInjection/IocPackage.cs` | HttpClient config |
| Domain models | `trunk/Degreed.Data.Standard/Domain/Coach/` | Entity changes |
| SQL schema | `trunk/Degreed.SqlDb/aicoach/` | Table/SP changes |
| Tests | `trunk/Degreed.*.Tests/` | Test coverage |

#### 2.3 fe-workspace (Angular Frontend)

| Area | Path | What to Look For |
|------|------|-----------------|
| Coach UI | `apps/lxp/src/app/degreed-coach/` | Components, services, facades |
| Studio UI | `apps/lxp/src/app/maestro-studio/` | Builder components, stores |
| Quiz UI | `apps/lxp/src/app/maestro-quiz/` | Quiz components |
| Roleplay UI | `apps/lxp/src/app/maestro-roleplay/` | Roleplay components |
| DGA UI | `apps/lxp/src/app/degreed-coach/degreed-assistant/` | DGA components |
| Shared | `libs/` | Shared libraries, models |
| Routes | `apps/lxp/src/app/` routing modules | Route changes |

#### 2.4 degreed-flutter (Mobile)

| Area | Path | What to Look For |
|------|------|-----------------|
| Coach | `lib/coach_chat/` | SSE, chat UI |
| Voice | `lib/mobile_coach/` | LiveKit, voice UI |
| Quiz | `lib/quiz/` | Quiz experience |
| DGA | `lib/degreed_assistant/` | Quick actions |
| Core | `lib/core/` | Shared services, DI |

#### 2.5 degreed-assistant (DGA — only if in scope)

| Area | Path | What to Look For |
|------|------|-----------------|
| Agent tools | `backend/genai/tools_and_chains/agent_utils.py` | Tool methods |
| Prompts | `backend/genai/prompts/` | Prompt templates |
| Intent | `backend/genai/intent_classifier.py` | Intent classification |
| API wrappers | `backend/api/` | .NET API clients |

### 3. Dependency Mapping & Cross-Project Impact Analysis

**CRITICAL:** When modifying EXISTING modules (not new code), you MUST trace the full dependency chain across ALL projects. All 5 repos are interlinked — a change in one layer can break consumers in another.

#### 3.1 Classify Each Change

For every modified file, determine:

| Classification | Validation Level |
|---------------|-----------------|
| **New file** (no existing consumers) | None needed |
| **Existing, same-project consumers only** | Intra-project check |
| **Existing, cross-project consumers** | **Full cross-project trace** |
| **API contract change** (endpoint signature, request/response) | **CRITICAL — all consumers** |
| **Database schema change** | **CRITICAL — all layers** |
| **Redis/session model change** | **CRITICAL — Python + .NET** |

#### 3.2 Trace Cross-Project Dependencies

For each "cross-project" or "critical" change, trace the FULL chain:

**Python → .NET direction:**
```
Python endpoint changed
  → Grep CoachAIBackendRoutes.cs for the route path
  → Find which Orchestrator calls it
  → Find which Controller exposes it
  → Check request/response DTOs match Python models
```

**.NET → Frontend direction:**
```
.NET controller/response changed
  → Grep fe-workspace/apps/lxp/src/app/**/services/ for endpoint
  → Check TypeScript interfaces match new response shape
  → Check component templates handle new/removed fields
  → Grep degreed-flutter/lib/ for the same endpoint
  → Check Dart models match new response shape
  → Check Cubit states handle the changes
```

**Database → All Layers:**
```
SQL table/SP changed
  → Check Entity Framework models in Degreed.Data.Standard
  → Check repositories that query the table
  → Check orchestrators that use the repository
  → Check if Python reads/writes this data via .NET callbacks
```

**Redis/Session → Python + .NET:**
```
SessionDataModel field changed
  → Check all Python code that reads/writes the field
  → Check .NET code that reads/writes Redis for the same key
  → Check if the field is part of the SSE session handshake
```

#### 3.3 Find All Importers

For each affected file, find everything that imports/references it:

```
# Python
grep -r "from {module}" --include="*.py" -l
grep -r "import {class}" --include="*.py" -l

# TypeScript/Angular
grep -r "import.*{class}" --include="*.ts" -l
grep -r "from.*{module}" --include="*.ts" -l

# C#
grep -r "using.*{namespace}" --include="*.cs" -l
grep -r "{ClassName}" --include="*.cs" -l

# Dart/Flutter
grep -r "import.*{file}" --include="*.dart" -l
```

#### 3.4 Produce Dependency Impact Matrix

Include this in the research document:

```markdown
## Cross-Project Dependency Impact Matrix

| Modified Module | Project | Direct Consumers | Indirect Consumers | Breaking? |
|----------------|---------|-----------------|-------------------|-----------|
| `sse/router.py` endpoint shape | coach-builder | CoachOrchestrator (.NET) | CoachApiService (Angular), CoachCubit (Flutter) | YES |
| `SessionDataModel.new_field` | coach-builder | redis_manager.py (same) | .NET Redis cache reads | MAYBE |
| New `feature/router.py` | coach-builder | None (new) | None | NO |

### Validation Actions Required
1. [ ] Verify .NET DTOs match updated Python response for endpoint X
2. [ ] Verify Angular interface updated for new field Y
3. [ ] Verify Flutter model updated for new field Y
4. [ ] Run integration test for cross-service flow Z
```

### 4. Database Migration Risk Detection

When any requirement touches `aicoach.*` tables, stored procedures, or database schema:

1. **Scan for SQL changes** in `Degreed/trunk/Degreed.SqlDb/aicoach/`:
   - Tables: `Tables/*.sql`
   - Stored Procedures: `Stored Procedures/*.sql`
   - Migrations: `Migrations/*.sql`

2. **Classify anticipated changes:**

| Change Type | Risk | Flag |
|------------|------|------|
| Add nullable column | LOW | Auto-approve |
| Add new table | LOW | Auto-approve |
| Add index | LOW | Check table size |
| Add non-nullable column | MEDIUM | Needs default value for existing rows |
| Modify stored procedure | MEDIUM | Check callers |
| Add constraint | MEDIUM | Check existing data compliance |
| Drop column | HIGH | Verify no code references remain |
| Change column type | HIGH | Data conversion risk |
| Drop table | HIGH | Verify no code references remain |
| Rename column | HIGH | Needs alias period for backwards compat |

3. **Add to research document:**
```markdown
## Database Migration Risk
| Anticipated Change | Table/SP | Risk | Notes |
|-------------------|----------|------|-------|
| {change} | aicoach.{name} | {LOW/MED/HIGH} | {details} |
```

4. **Flag HIGH risk items** prominently — these affect the Phase 3.5 review and may constrain which approaches are viable.

---

### 5. Existing Building Blocks Discovery

**CRITICAL — Don't just find what to change. Find what ALREADY EXISTS that you can reuse.**

This is the difference between a shallow scan and a deep research. Before proposing any new code, exhaustively search for existing building blocks.

#### 5.1 Existing Code Building Blocks

For each requirement, ask: "Does something like this already exist?"

**Search for reusable utilities, services, and patterns:**
```
# Python — existing helper functions, utilities, base classes
Grep for keywords in: backend/app/utils/, backend/app/dg_component/, backend/app/db/
Read the files — don't just note they exist. Understand what they do.

# .NET — existing orchestrators, services, domain models
Grep for keywords in: trunk/Degreed.Common.Standard/, trunk/Degreed.Core*/
Check if a similar orchestrator already handles a related flow.

# Angular — existing services, facades, components
Grep for keywords in: apps/lxp/src/app/**/services/, libs/
Check if a similar facade or service already manages related state.

# Flutter — existing cubits, repositories, models
Grep for keywords in: lib/core/, lib/**/bloc/, lib/**/services/
Check if a cubit or repository already handles related data.
```

**What to look for:**
- Helper functions that do 80% of what you need (extend, don't rewrite)
- Base classes you should inherit from (e.g., `MaestroTestBase`, `BaseVoiceAgent`, `DegreedCubit`)
- Shared models/DTOs that already carry the data you need
- Configuration patterns already established (Redis keys, environment variables)
- Validation logic that applies to your feature

**Produce a reuse inventory:**
```markdown
## Existing Building Blocks
| What Exists | Location | Reusable For | Modification Needed |
|-------------|----------|-------------|-------------------|
| `DegreedApiService` | coach-builder/dg_component/ | .NET callbacks | Add new endpoint to EndpointRegistry |
| `SessionDataModel` | coach-builder/db/ | Session state | Add 2 new fields |
| `CoachOrchestrator.SendSseRequestAsync` | Degreed/Orchestrators/ | SSE forwarding | None — use as-is |
| `coach-api.service.ts` | fe-workspace/services/ | API calls | Add new method |
```

#### 5.1.1 MANDATORY: Figma-Driven Pattern Discovery

**🚨 If the feature has ANY frontend UI, this section is MANDATORY. Skip = research doc rejected.**

**The agent MUST look at the Figma design FIRST, then automatically search for matching patterns.**

##### Step 1: Analyze Figma Design (or description if no Figma)
Look at the design and identify UI elements:
- Chat/messaging interface? → search for `*conversation*`, `*chat*`, `*message*`
- Side panel/drawer? → search for `*drawer*`, check Apollo `DrawerService`
- Form with inputs? → search for `*form*`, check Apollo `da-input`, `da-textarea`
- Card/list view? → search for `*card*`, `*list*`, `*item*`
- Modal/dialog? → check Apollo `DialogService`
- Tabs? → check Apollo `da-tabs`
- Buttons? → check Apollo `da-button`
- Icons? → check Apollo `da-icon`

##### Step 2: Auto-Generate Search Queries from Figma
Based on what you SEE in the design, generate searches:

```bash
# For EACH UI element type you identified in Figma:

# Example: Figma shows a chat interface with messages
UI_KEYWORDS="chat conversation message"
for kw in $UI_KEYWORDS; do
  grep -r "export interface.*$kw" apps/lxp/src/app/ --include="*.ts" -i | head -10
  find apps/lxp/src/app -iname "*$kw*" -type d
done

# Example: Figma shows a drawer/side panel
grep -r "DrawerService\|drawerService" apps/lxp/src/app/ --include="*.ts" | head -10

# Example: Figma shows suggestion pills/chips
grep -r "suggestion\|chip\|pill" apps/lxp/src/app/ --include="*.ts" -i | head -10

# Example: Figma shows a text input area
grep -r "textarea\|input.*component" apps/lxp/src/app/ --include="*.ts" -i | head -10
```

##### Step 3: Check Apollo for EVERY UI Element
**Before searching the app codebase, check if Apollo already has the component:**
```bash
# List Apollo components
ls libs/shared/apollo/angular/src/lib/components/

# Search Apollo for the element type
grep -r "selector.*da-" libs/shared/apollo/ --include="*.ts"
```

##### Step 4: Check for Feature Flags (readOnly, mode, etc.)
Once you find existing components, check if they have configurability:
```bash
# Check for optional modes on found components
grep -r "@Input.*readOnly\|@Input.*mode\|@Input.*disabled" {found_component_path}
```

##### Step 5: Document Findings
```markdown
## Frontend Building Blocks (Figma-Driven Discovery)

### What I saw in Figma:
- [x] Chat/message interface
- [x] Side drawer panel
- [x] Text input with send button
- [x] Suggestion pills
- [ ] Form inputs
- [ ] Cards/list

### Existing Models Found (EXTEND these):
| Model | Path | EXTEND? | Why |
|-------|------|---------|-----|
| `ChatMessage` | `@app/degreed-coach/models` | YES | 90% field match |

### Existing Components Found (REUSE these):
| Component | Path | Config Flags | REUSE? |
|-----------|------|-------------|--------|
| `CoachConversationComponent` | `degreed-coach/components/` | `readOnly`, `botMode` | YES |
| `DrawerService` | `@degreed/apollo` | standard drawer config | YES |

### Apollo Components to Use:
| UI Element | Apollo Component | Notes |
|------------|-----------------|-------|
| Send button | `da-icon` with `arrow-up` | Match existing chat input pattern |
| Icons | `da-icon` | NOT raw heroicons |
| Text input | `da-textarea` OR match `coach-conversation-input-v2` | Check which fits |
```

**WHY FIGMA-FIRST:**
Looking at Figma BEFORE searching code ensures you search for what you NEED, not what you assume.
Ask Maestro failure: Didn't look at Figma to see it was a chat interface → didn't search for chat patterns → built from scratch.

#### 5.2 Existing Data & Database Objects

Don't assume you need new tables. Check what data already exists.

**Read the relevant SQL schema files:**
```
Degreed/trunk/Degreed.SqlDb/aicoach/Tables/
Degreed/trunk/Degreed.SqlDb/aicoach/Stored Procedures/
Degreed/trunk/Degreed.SqlDb/aicoach/Views/
```

**For each requirement, ask:**
- Does a table already store this data? (Read the table definition — check ALL columns)
- Does a stored procedure already query/transform this data?
- Is the data populated by another feature? (Check INSERT/UPDATE references)
- Does the Entity Framework model in `Degreed.Data.Standard/Domain/Coach/` already expose this?
- Does the Redis cache already hold this? Check `SessionDataModel` fields and `redis_manager.py`

**Produce a data inventory:**
```markdown
## Existing Data
| Data Needed | Already Exists? | Location | Notes |
|-------------|----------------|----------|-------|
| Coach configuration | YES | aicoach.Coaches + Redis cache | Loaded at session start |
| Conversation history | YES | aicoach.ConversationMessages | Queried by session_id |
| User skill profile | YES | dbo.UserSkills + API | Available via .NET callback |
| {new data} | NO | — | Needs new table/column |
```

#### 5.3 Feature Flag Divergence Analysis

**CRITICAL for this multi-tenant platform.** Different clients have different feature flags enabled. The SAME API endpoint may return different data shapes depending on feature flags.

**Check which flags affect the area you're working in:**
```
# Search for feature flag checks in the affected code paths
Grep for "LaunchDarkly", "FeatureFlag", "IFeatureFlagOrchestrator", "IsEnabled" in affected files
Grep for "DegreedCoach", "MaestroQuiz", flag names from CLAUDE.md Section 10
```

**For each flag found, document:**
```markdown
## Feature Flag Divergence
| Flag | What It Controls | When ON | When OFF | Affects This Feature? |
|------|-----------------|---------|----------|---------------------|
| DegreedCoach | Coach + Roleplay access | Full coach UI | No coach | YES — our feature requires this |
| MaestroQuiz | Quiz + Forms | Quiz enabled | No quiz | MAYBE — if quiz data is involved |
| {per-scope flags} | DGA scopes | Scope available | Scope hidden | Check if DGA is in scope |
```

**Identify data shape differences:**
- What does the response look like for a client WITH the feature?
- What does it look like WITHOUT?
- Will your change break clients who don't have the flag?
- Do you need to add a NEW flag for your feature?

#### 5.4 Edge Cases & Cavities

Actively hunt for edge cases by examining the boundaries of the affected code:

**Data edge cases:**
- What happens with empty/null values? (Read validation logic)
- What happens with the first user vs. a user with 1000 conversations?
- What happens for orgs with 10 users vs. 10,000?
- What happens when Redis cache expires (24h TTL)?

**Cross-feature edge cases:**
- If a user has an active coach session AND starts a quiz, what happens?
- If post-processing is running AND the user starts a new conversation?
- If the feature involves file upload AND the org has KB restrictions?

**Multi-tenant edge cases:**
- Single-org users vs. multi-org users
- Admin users vs. learner users vs. manager users
- Clients with custom SSO vs. standard auth

**Produce a cavities list:**
```markdown
## Edge Cases & Cavities
| Scenario | Current Behavior | Risk to Our Feature | Mitigation |
|----------|-----------------|-------------------|------------|
| User has no coach access (flag OFF) | 403 on coach endpoints | Our feature might expose data without flag check | Add ValidateCoachAccessAttribute |
| Redis session expires mid-conversation | Session data lost, 500 error | Our new fields would be null | Handle null gracefully |
| Multi-org user switches org | Session tied to original org | Feature data may belong to wrong org | Validate org membership |
```

---

### 6. External Research — Internet & Documentation

**THIS IS MANDATORY, NOT OPTIONAL.** Every research phase MUST include substantial external research. "I already know how to build this" is not acceptable — the internet has production experience, edge cases, and patterns that no single model knows.

**Minimum requirement:** At least 5 WebSearch queries executed, at least 3 results read in full via WebFetch, and a written summary in the research doc. If external research produces nothing useful, document what was searched and why nothing applied — but the search MUST happen.

**Run external research as DEDICATED PARALLEL AGENTS** — these are not optional side-tasks, they are first-class research agents:

```python
# Launch ALL of these in parallel alongside the repo scan agents:

Agent({ description: "Deep web research: architecture patterns", model: "opus",
        prompt: """You are a research agent. Your SOLE job is to search the internet deeply for how
{feature/problem} has been solved in production by real companies.

DO NOT STOP after 2-3 searches. Run AT LEAST 8-10 different searches. Read the FULL articles, not just snippets.

Search strategy (execute ALL of these):
1. '{feature} implementation architecture production'
2. '{feature} best practices 2025 2026'
3. '{similar-product-1} {feature} how it works' (e.g., 'Duolingo AI coaching', 'Coursera quiz generation')
4. '{similar-product-2} {feature} architecture' (try 3+ similar products)
5. '{core-technology} {pattern} production lessons' (e.g., 'SSE streaming multi-service production')
6. '{feature} at scale challenges pitfalls'
7. '{feature} open source implementation github'
8. 'blog {feature} engineering lessons learned'
9. site:medium.com OR site:dev.to '{feature} architecture'
10. '{feature} conference talk summary'

For EACH search result:
- Use WebFetch to read the FULL page, not just the search snippet
- Extract: architecture decisions, code patterns, performance numbers, pitfalls documented
- Note the source URL, author, date, and credibility

Produce a DETAILED report (not bullet points):
- For each significant finding: 2-3 paragraphs explaining what they did, why, and what we can learn
- Include code examples or configuration snippets when relevant
- Explain how each finding maps to our specific architecture (Python + .NET + Angular + Flutter)
- Rank findings by relevance: HIGH (directly applicable) / MEDIUM (adaptable) / LOW (background context)
""" })

Agent({ description: "Deep web research: known issues & anti-patterns", model: "opus",
        prompt: """You are a research agent focused on finding PROBLEMS, not solutions.
Search for what GOES WRONG when building {feature/problem}.

Search strategy (execute ALL):
1. '{feature} known issues production'
2. '{core-library} {feature-pattern} bugs' (e.g., 'FastAPI SSE connection drops')
3. '{framework} {pattern} memory leak' (e.g., 'Angular Signals subscription leak')
4. '{feature} postmortem incident'
5. site:stackoverflow.com '{feature} {error-pattern}'
6. site:github.com/issues '{library} {symptom}'
7. '{feature} performance degradation at scale'
8. '{feature} security vulnerability'

For each issue found:
- Exact problem description
- Root cause
- Fix or workaround
- Does this apply to our stack? (Python 3.12 + FastAPI + .NET 8 + Angular 20 + Flutter 3.35)
""" })

Agent({ description: "Library docs: latest features & limitations", model: "opus",
        prompt: """Research the CURRENT documentation for every library/SDK involved in {feature}.

Use mcp__context7__resolve-library-id + mcp__context7__query-docs for each:
- FastAPI (if Python endpoints involved)
- Angular (if frontend involved) — especially Signals, HttpClient
- Flutter (if mobile involved) — especially Bloc/Cubit, Dio
- Azure OpenAI SDK (if LLM involved)
- LiveKit (if voice involved) — use mcp__livekit-docs__docs_search
- LangChain (if DGA involved) — use mcp__docs-langchain__search_docs_by_lang_chain
- Redis (if caching/session involved)

For each library:
- Check for NEW features that could simplify our implementation
- Check for DEPRECATED features we might be using
- Check for known limitations or performance constraints
- Check version compatibility with our stack versions
""" })
```

#### 6.1 Web Search — What to Search For

**For features:**
```
WebSearch: "{feature description} implementation best practices"
WebSearch: "{feature description} architecture patterns"
WebSearch: "{similar product} {feature} how it works"
    e.g., "Duolingo AI coaching architecture"
    e.g., "Coursera real-time quiz feedback system"
    e.g., "SSE streaming best practices multi-service"
WebSearch: "{feature} at scale challenges"
```

**For bugs:**
```
WebSearch: "{error message}" site:stackoverflow.com
WebSearch: "{library name} {symptom}"
    e.g., "FastAPI SSE connection dropped intermittently"
WebSearch: "{framework} {pattern} known issues"
    e.g., "Angular Signals memory leak subscription"
WebSearch: "{error} github issues {library}"
```

**For specific technologies in our stack:**
```
WebSearch: "Azure OpenAI {specific feature}" (streaming, function calling, realtime API)
WebSearch: "LiveKit {specific feature}" (agent disconnect, room events, reconnection)
WebSearch: "Redis vector search {pattern}" (hybrid search, filtering, performance)
WebSearch: "{technology} production lessons learned 2025 2026"
```

**For each search result found:** Use `WebFetch` to read the full article/page, not just the snippet. Extract specific code examples, architecture diagrams, configuration details, and lessons learned.

#### 6.2 Library Documentation

Use `mcp__context7__resolve-library-id` + `mcp__context7__query-docs` for up-to-date docs on:
- Any library/SDK involved in the feature (FastAPI, Angular, Flutter, LiveKit, etc.)
- New API features that might simplify our implementation
- Migration guides if we're upgrading a dependency
- Known limitations or workarounds

Use `mcp__livekit-docs__docs_search` if the feature involves voice/WebRTC.
Use `mcp__docs-langchain__search_docs_by_lang_chain` if the feature involves DGA/LangChain.

#### 6.3 Use PAL for Deep Analysis

Use `mcp__pal__thinkdeep` to reason about:
- "Given this codebase structure, what are the 3 best architectural approaches for {feature}?"
- "What are the hidden risks of modifying {module} in a multi-service architecture?"

Use `mcp__pal__analyze` on the affected code to understand:
- Complexity hotspots
- Potential performance bottlenecks
- Security implications

#### 6.4 Produce External Research Document

**External research gets its own dedicated section in the research document — not a summary table, a FULL write-up.**

Write this as a substantial section (not bullet points). For each finding, include:
- **Source** — URL, article title, author, date
- **What they did** — Detailed description of their approach, architecture, or solution
- **Key code/config examples** — If the source has code snippets or configuration that's relevant, include them
- **What worked and what didn't** — Lessons, pitfalls, gotchas they documented
- **How it applies to us** — Specific mapping to our architecture (Python/FastAPI → .NET → Angular → Flutter)
- **What we should adopt vs. skip** — Concrete recommendation

```markdown
## 9. External Research

### 9.1 Industry Patterns & Best Practices

#### {Pattern 1 Name} — from {Source}
**Source:** {URL}
**Summary:** {2-3 paragraph description of what they did and why}
**Architecture:**
{diagram or description of their approach}
**Key Implementation Details:**
{code examples, configuration, specific technical decisions}
**Lessons Learned:**
- {what worked}
- {what failed}
- {gotchas}
**Applicability to Our System:**
- Fits because: {reasons}
- Doesn't fit because: {reasons}
- **Recommendation:** {Adopt / Adapt / Skip} — {why}

#### {Pattern 2 Name} — from {Source}
{same structure}

### 9.2 Library & SDK Findings

| Library | Version | Finding | Code Example | Impact on Our Approach |
|---------|---------|---------|-------------|----------------------|
| {library} | {version} | {new feature, deprecation, limitation} | `{code snippet}` | {how it changes what we should do} |

### 9.3 Similar Product Implementations

#### How {Company/Product} Solves This
**Source:** {URL}
**Their Stack:** {what they use}
**Their Approach:** {detailed description}
**What We Can Learn:** {specific takeaways for our architecture}

### 9.4 Known Issues & Pitfalls

| Issue | Source | Affects Us? | Mitigation |
|-------|--------|------------|------------|
| {issue description} | {URL/SO link} | Yes/No/Maybe | {how to avoid it} |

### 9.5 Recommended Foundation

Based on external research, the recommended starting point for implementation is:
- **Pattern:** {which pattern to follow}
- **Libraries:** {any new libraries to consider, or confirm existing ones are sufficient}
- **Architecture:** {any architectural insight that should inform the ADR}
- **Pitfalls to avoid:** {top 3 things to watch out for}
```

---

### 7. Related Tickets Search

Use `mcp__atlassian__searchJiraIssuesUsingJql`:

```
# Search for related work
text ~ "{feature keywords}" AND project in (PD, AIDATASCI) ORDER BY updated DESC

# Search for related bugs
text ~ "{feature keywords}" AND issuetype = Bug ORDER BY updated DESC

# Search for recent work in the area
labels in ("{area-label}") AND updated >= -90d ORDER BY updated DESC
```

For each related ticket found:
- Note its status, resolution, and key findings
- Check if it was a prior implementation attempt
- Check if it's a known issue or limitation

### 8. Confluence Wiki Search

**Search the team's wiki for existing documentation, design decisions, and prior art** related to this feature. Other teams may have already documented solutions, SDDs, or architectural decisions that affect this work.

Use `mcp__atlassian__searchConfluenceUsingCql`:

```
# Search for pages about the feature area
CQL: text ~ "{feature keywords}" ORDER BY lastModified DESC

# Search for SDDs that may cover this area
CQL: title ~ "Solution Design" AND text ~ "{feature keywords}"

# Search for architecture docs
CQL: space = "AG" AND text ~ "{feature keywords}"

# Search in specific team spaces
CQL: space in ("AG", "TechDocs", "PA", "DSTS") AND text ~ "{feature keywords}"
```

**For each relevant page found:**
1. Read it via `mcp__atlassian__getConfluencePage` (use `contentFormat: "markdown"`)
2. Extract: decisions made, constraints documented, related APIs, data models discussed
3. Note if it contradicts or supports any of our proposed approaches
4. Check if it documents pitfalls or lessons learned from a prior attempt

**What to look for:**
- Prior SDDs for the same or related features — they contain architectural decisions that may constrain us
- One-pagers and PRDs — they have product context and edge cases
- Runbooks or incident docs — they reveal what broke last time in this area
- Team-specific wiki pages with local knowledge about modules we're touching

**Produce:**
```markdown
## Confluence Wiki Findings
| Page | Space | Relevance | Key Takeaway |
|------|-------|-----------|-------------|
| {title} | {space} | High/Medium | {what we learned} |

### Key Decisions from Wiki
1. {Decision from SDD/doc} — constrains our approach because {reason}
2. {Prior attempt documented} — failed because {reason}, we should avoid {pattern}
```

---

### 9. GitHub PR History Search

**Search for related Pull Requests** that touched the same files and modules. PRs contain implementation decisions, reviewer comments, and context that isn't in the codebase.

```bash
# Search for PRs that mention the feature keywords
gh pr list --repo degreed/Degreed --search "{feature keywords}" --state all --limit 20 --json number,title,state,mergedAt,url
gh pr list --repo degreed/fe-workspace --search "{feature keywords}" --state all --limit 20 --json number,title,state,mergedAt,url
gh pr list --repo degreed/degreed-coach-builder --search "{feature keywords}" --state all --limit 20 --json number,title,state,mergedAt,url

# Search for PRs that touched specific files we're going to modify
gh pr list --repo degreed/Degreed --search "path:{affected-file}" --state merged --limit 10 --json number,title,mergedAt,url

# Search by label if relevant
gh pr list --repo degreed/Degreed --label "maestro" --state all --limit 20 --json number,title,state,url
```

**For each relevant PR found:**
1. Read the PR description: `gh pr view {number} --repo {owner/repo} --json body,title,comments`
2. Check reviewer comments for architectural feedback or concerns
3. Check if it was reverted (search for "revert" PRs referencing the same number)
4. Note the approach taken — can we reuse or extend it?

**What to look for:**
- PRs that added/modified the same endpoints we're touching — they have implementation context
- Reverted PRs — they tell us what DIDN'T work
- PRs with extensive review discussions — they contain architectural decisions made informally
- PRs from related features — they may have solved a subproblem we also need to solve
- Draft/closed PRs — they may be prior abandoned attempts at this feature

**Produce:**
```markdown
## GitHub PR History
| PR | Repo | Status | Relevance | Key Finding |
|----|------|--------|-----------|-------------|
| #{number} | {repo} | Merged/Closed/Reverted | {why relevant} | {what we learned} |

### Key Insights from PRs
1. PR #{N} solved {subproblem} using {pattern} — we can reuse this
2. PR #{N} was reverted because {reason} — we must avoid {pattern}
3. PR #{N} reviewer flagged {concern} — still applies to our work
```

**Run these searches in parallel** — one agent per repo:
```python
Agent({ description: "Search Degreed PRs", model: "opus",
        prompt: "Search GitHub PRs in degreed/Degreed for {keywords}..." })
Agent({ description: "Search fe-workspace PRs", model: "opus",
        prompt: "Search GitHub PRs in degreed/fe-workspace for {keywords}..." })
Agent({ description: "Search coach-builder PRs", model: "opus",
        prompt: "Search GitHub PRs in degreed/degreed-coach-builder for {keywords}..." })
```

---

### 10. Performance Baseline (Optional)

If the feature affects request paths or performance-sensitive code:

Use `mcp__datadog__get_logs`:
- Search for current error rates on affected endpoints
- Look for timeout patterns

Use `mcp__datadog__list_traces`:
- Get latency baselines for affected services
- Identify bottlenecks

Use `mcp__datadog__get_all_services`:
- Map service dependency chain

### 11. Produce Research Document

Write to `docs/plans/{next-id}-{feature}-research.md`:

```markdown
# {ID} — {Feature Name} Deep Research

**Date:** {today}
**Epic:** {EPIC-ID}
**Researcher:** Claude + {user}

## 1. Requirements Summary
{from intake or ticket}

## 2. Cross-Repo Impact Analysis

### degreed-coach-builder (Python)
| File | Current Purpose | Required Change | Risk | Dependencies |
|------|----------------|-----------------|------|-------------|

### Degreed (.NET)
| File | Current Purpose | Required Change | Risk | Dependencies |
|------|----------------|-----------------|------|-------------|

### fe-workspace (Angular)
| File | Current Purpose | Required Change | Risk | Dependencies |
|------|----------------|-----------------|------|-------------|

### degreed-flutter
| File | Current Purpose | Required Change | Risk | Dependencies |
|------|----------------|-----------------|------|-------------|

### degreed-assistant (DGA)
{only if in scope, otherwise "Not in scope for this feature"}

## 3. Dependency Graph
{ASCII diagram showing what depends on what}

## 4. Database Impact
| Table/SP | Change Type | Migration Needed |
|----------|-------------|-----------------|

## 5. Existing Building Blocks (Reuse Inventory)
| What Exists | Location | Reusable For | Modification Needed |
|-------------|----------|-------------|-------------------|

## 6. Existing Data
| Data Needed | Already Exists? | Location | Notes |
|-------------|----------------|----------|-------|

## 7. Feature Flag Divergence
| Flag | What It Controls | When ON | When OFF | Affects This Feature? |
|------|-----------------|---------|----------|---------------------|

## 8. Edge Cases & Cavities
| Scenario | Current Behavior | Risk | Mitigation |
|----------|-----------------|------|------------|

## 9. External Research
### Industry Patterns
| Source | Pattern | Applicable? | How to Apply |
|--------|---------|-------------|-------------|
### Library/SDK Findings
| Library | Finding | Impact |
|---------|---------|--------|

## 10. UI & Design Layer (if frontend is in scope)

### Design Status
| Item | Status |
|------|--------|
| Figma design | {URL / not available} |
| Mockup generated | {yes — approved / yes — pending / no} |
| Apollo components needed | {list} |
| Apollo gaps (need custom) | {list} |

### Proposed UI Layout
{From intake Phase 0 — the approved mockup or layout description}

### UI Components Map
| UI Element | Angular Component | Flutter Widget | Apollo? | i18n? |
|-----------|------------------|---------------|---------|-------|
| {toggle} | `apo-toggle` | `Switch` | Yes | Yes |
| {button} | `apo-button` | `ElevatedButton` | Yes | Yes |
| {custom card} | Custom | Custom | No — gap | Yes |

### UI States
| State | Angular | Flutter | What to Show |
|-------|---------|---------|-------------|
| Default | {component state} | {cubit state} | {description} |
| Loading | Skeleton | Shimmer | {description} |
| Error | `apo-alert` | SnackBar | {error message} |
| Empty | `apo-empty-state` | Custom | {empty description} |

## 11. Layer Coverage Summary

| Layer | Covered | Key Findings |
|-------|---------|-------------|
| UI — Angular | {Yes/No/N-A} | {1-line summary} |
| UI — Flutter | {Yes/No/N-A} | {1-line summary} |
| UI — Design | {Yes/No/N-A} | {Figma / mockup / none} |
| API — .NET | {Yes/No/N-A} | {1-line summary} |
| AI — Python | {Yes/No/N-A} | {1-line summary} |
| AI — DGA | {Yes/No/N-A} | {1-line summary} |
| AI — LLM Prompts | {Yes/No/N-A} | {1-line summary} |
| Database | {Yes/No/N-A} | {1-line summary} |
| Redis/Session | {Yes/No/N-A} | {1-line summary} |
| Feature Flags | {Yes/No/N-A} | {1-line summary} |

## 12. API Contract Changes
| Endpoint | Current | Proposed | Breaking |
|----------|---------|----------|----------|

## 13. Related Jira Tickets
| Ticket | Status | Relevance |
|--------|--------|-----------|

## 12. Performance Baseline
{Datadog metrics or "N/A"}

## 13. Database Migration Risk
| Anticipated Change | Table/SP | Risk | Notes |
|-------------------|----------|------|-------|

## 14. Risk Assessment
| Area | Risk Level | Mitigation |
|------|-----------|------------|

## 15. Open Questions
{List of unresolved questions}
```

### 12. Update Jira

If a Deep Research sub-task exists, update it via `mcp__atlassian__addCommentToJiraIssue`:

```
Research complete. Document: docs/plans/{id}-{feature}-research.md

Key findings:
- {N} repos affected: {list}
- {M} files need changes
- Risk level: {High/Medium/Low}
- {any blockers or open questions}
```

### 13. Save Key Findings to Memory

**Significant discoveries MUST be saved to `claude-mem`** so future pipeline runs can reference them. This is how the system learns over time.

**What to save (via `mcp__plugin_claude-mem_mcp-search__*` or auto memory):**

1. **Reusable building blocks found** — "ManagersController.cs already has GetDirectReports API" so a future feature touching team data doesn't need to rediscover this
2. **Architectural constraints discovered** — "aicoach.Coaches table has 15 columns, adding more requires migration" so future work knows the schema state
3. **Feature flag interactions** — "DegreedCoach flag gates all coach endpoints — any new coach feature must respect this" so nobody bypasses it
4. **Cross-service contract patterns** — "Python SSE endpoints return snake_case, .NET proxy converts to camelCase" so future agents don't mismatch
5. **Edge cases and gotchas** — "Redis session TTL is 24h — any session-dependent feature must handle expiry" so the same bug isn't introduced twice
6. **Reverted approaches** — "Strategy pattern extension for X was tried in PR #1234 and reverted because Y" so nobody tries the same failed approach

**What NOT to save:**
- File paths (they change constantly — grep instead)
- Exact line numbers (code moves on every commit)
- Version numbers (outdated within weeks)
- Anything derivable from reading the current code

**Format for saving:**
```
Save finding: "{concise, searchable description}"
Context: Found during research for {EPIC-ID}
Evidence: {file, Confluence page, PR, or URL where this was verified}
Date: {today}
```

### 14. Verify Stale Memories

**BEFORE acting on any finding recalled from claude-mem, VERIFY it's still true.**

Memories are snapshots in time. Code changes, APIs evolve, tables get modified.

**Verification checklist for recalled memories:**
1. If the memory names a **file path** → check the file still exists (Glob)
2. If the memory names a **function or API** → grep for it, confirm it's still there
3. If the memory references a **Confluence page** → re-fetch it, check if it was updated since the memory was saved
4. If the memory references a **database table/column** → read the current SQL definition
5. If the memory references a **PR or decision** → check if it was reverted or superseded

**If a memory is stale:**
- Note it in the research document: "Memory said X, but current state is Y"
- Update or remove the stale memory
- Proceed based on CURRENT reality, not the memory

```
Example:
  Memory (2026-03-15): "SessionDataModel has 12 fields"
  Verification: Read redis_manager.py → now has 15 fields (3 added since memory)
  Action: Use current count (15), update memory
```

---

### 14.5 RESEARCH VALIDATION CHECKLIST (MANDATORY)

**Before presenting the research to the user, verify ALL checkboxes:**

```
## Research Doc Completeness Gate

### Step 1: Figma Analysis (REQUIRED FOR FE FEATURES)
- [ ] Looked at Figma/design BEFORE searching code
- [ ] Listed UI element types seen: {drawer, chat, form, list, etc.}
- [ ] Extracted keywords from design: {keyword1, keyword2, keyword3}

### Step 2: Auto-Generated Searches from Figma
- [ ] Ran grep/find for EACH keyword from Figma analysis
- [ ] Checked Apollo FIRST for standard elements (drawer, button, icon, input, tabs)
- [ ] READ at least 3 found models/components (not just listed file paths)

### Step 3: Documentation
- [ ] Documented "What I saw in Figma" checklist
- [ ] Documented reusable models with "EXTEND?" decision column
- [ ] Documented reusable components with "REUSE?" decision column
- [ ] Documented feature flags (readOnly, mode) on found components
- [ ] Listed Apollo components to use

### Why This is Figma-First
Looking at the design FIRST ensures you search for what the design NEEDS.

Bad flow:
  "I'm building a chat feature" → search for "chat" → miss Figma shows a drawer

Good flow:
  Look at Figma → see "drawer + messages + input + pills" → search for ALL of those → find DrawerService + ChatMessage + CoachConversation + suggestion patterns
```

**If ANY checkbox is unchecked, go back and complete it before presenting to user.**

---

### 15. Present to User

Display the research summary and ask whether to proceed with the architecture decision phase.

## Tips

- Use parallel Agent calls (subagent_type: "Explore") to search multiple repos simultaneously
- Focus depth on the primary repo — if it's a Python Maestro feature, spend 60% of research there
- Always check the domain model truths: Roleplay = Coach subtype, Form = Quiz-backed
- **Don't just find files — READ them.** Understand what they do, what data they handle, what patterns they use. A file path list is not research.
- **Always check what already exists before proposing new code.** The reuse inventory (Section 5.1) is the most valuable part of the research — it saves implementation time and prevents reinventing the wheel.
- **Always check the database.** Read the actual table definitions. Check if columns you need already exist. Check if stored procedures already compute what you need.
- **Always check feature flags.** Data shapes differ by client configuration. If you don't account for flag divergence, your feature will break for clients with different flag states.
- **Always search the internet.** Even 10 minutes of web search can save hours of wrong-direction implementation. Check how others solved similar problems.
- For bug tickets, also use `git blame` and `git log` on affected files (like `dg-jira-investigate`)
- Use `mcp__context7` for library docs, `mcp__livekit-docs` for voice, `mcp__docs-langchain` for DGA
