---
name: dev-pipeline
description: Use when starting any implementation task in the Maestro/Degreed workspace — building a feature, fixing a bug, or refactoring across repos — and you need the right stack/feature skill, cross-repo conventions, and validation gates
---

# Development Pipeline

Standard workflow for implementing any task — feature, bug fix, or refactor — in the Maestro workspace. Follow this pipeline to ensure quality, consistency, and proper cross-repo coordination.

This skill is the **domain orchestration layer**: it supplies the Degreed-specific stack/feature knowledge and wires each stage to the superpowers discipline that governs it. The disciplines do the heavy lifting; this skill tells you *which Degreed skill and which superpowers skill to invoke at each stage*.

## When to Use

- Starting any implementation task
- User asks to build a feature, fix a bug, or refactor code
- Planning how to approach a multi-repo change
- Unsure which repo, skill, or pattern to start with

## Process Spine — Compose These Skills

Each stage runs *on* a superpowers discipline. Invoke the governing skill, not just the domain notes below.

| Stage | Governing discipline (invoke) | Domain skills (this repo) |
|-------|-------------------------------|---------------------------|
| 1. Understand | `superpowers:research-before-implementing` (search-first, extend-don't-duplicate) | `degreed-architecture`, the stack/feature skills, `get-api-docs`, `prompt-lookup` |
| 2. Plan | `superpowers:brainstorming` → `superpowers:writing-plans` | `adr` |
| 3. Implement | `superpowers:test-driven-development` + `superpowers:plan-adherence` (no drift without amending the plan) | the stack skills' conventions |
| 4. Validate | `superpowers:verification-before-completion`; for high-stakes correctness/security calls `superpowers:multi-model-validation` | the test-harness `test-*` skills, `application-profiler` |
| 5. Document | — | `feature-document`, `adr` |

For the full multi-approach Epic→PR pipeline (parallel worktrees, critic, deploy), use `feature-builder` instead — it composes these same disciplines at larger scale.

---

## Stage 1: Understand

Before touching code, understand what you're working with.

### 1.1 Identify the scope
- Which experience type? (Coach, Roleplay, Quiz, Forms, DGA) → Load the matching **feature skill** (`degreed-experiences-feature`, `degreed-experience-builder-feature`, `degreed-assistant-feature`)
- Which repo(s) are affected? → Load the matching **stack skill** (`degreed-dotnet-stack`, `degreed-coach-builder-stack`, `degreed-assistant-stack`, `degreed-frontend-stack`, `degreed-flutter-stack`)
- Does it cross repos? → Remember the domain truths: Roleplay = Coach subtype, Form = Quiz-backed, `degreed-coach-builder` is the primary Maestro AI backend, `degreed-assistant` is only for DGA quick-action paths
- Need the full platform architecture? → Load `degreed-architecture`

### 1.2 Research the current implementation
- Read existing code in the affected area before proposing changes
- For cross-repo flows (UI → .NET → Python → persistence), trace each layer using the stack skills
- For API contract changes, check `.NET` route constants in `CoachAIBackendRoutes.cs` and the matching Python FastAPI routers
- For auth/access issues, check controller attributes (`ValidateCoachAccessAttribute`) and feature flag checks
- Search across all repos for reusable components, utilities, or patterns — prefer extending over creating

### 1.3 Check for third-party dependencies
- If the task involves a new SDK, library, or external API → use the `get-api-docs` skill to fetch current documentation via `chub` rather than relying on training data
- If the task involves AI prompts → use the `prompt-lookup` skill to search for existing prompt templates

---

## Stage 2: Plan

For non-trivial changes, plan before coding.

### 2.1 Architecture decisions
- If multiple approaches exist, document at least 2 options with trade-offs
- For significant architectural choices → use the `adr` skill to generate a formal Architecture Decision Record in `docs/architecture/`
- Check existing ADRs in `docs/architecture/` to avoid conflicting with past decisions

### 2.2 Cross-repo coordination
- If your change requires work in another repo (e.g., new .NET endpoint for a Python feature):
  - Design the interface contract first (request/response shape, route, headers)
  - Implement the contract consumer with clear TODOs for the provider side
  - Document what the other repo needs to implement
- Check existing patterns in `CoachAIBackendRoutes.cs` (route definitions) and the matching orchestrators

### 2.3 Async and background work
- If the feature involves delayed processing, polling, or background jobs:
  - Follow the `ApiRequests` tracking pattern (.NET creates tracking record, Python processes, frontend polls status)
  - Post-processing uses callback URLs for completion notification
  - Status flow: Pending → Processing → Success/Failure/Timeout

### 2.4 Voice and realtime
- If the feature involves LiveKit, voice calls, or WebRTC:
  - Registration: .NET calls Python `/dgcb/api/realtime/register-realtime-call` → returns LiveKit token + room URL
  - Voice agents: `BaseVoiceAgent` → `CoachAgent` (RAG-enabled) / `RolePlayAgent` (time-managed with 70%/90%/100% warnings)
  - Post-call: triggers post-processing pipeline (same 11 extraction types as text)

### 2.5 File and RAG workflows
- If the feature involves document upload, knowledge bases, or RAG:
  - Upload pipeline: Document → Chunk → Embed (text-embedding-3-large) → Store in Azure Managed Redis vector store
  - Query-time RAG: 5 search queries + 1 exact match, quorum=3, timeout=2.5s, optional re-ranking
  - Async: file processing is backgrounded via ApiRequests tracking

---

## Stage 3: Implement

### 3.1 Follow repo conventions
Match each repo's existing style — don't introduce new patterns unless necessary:

| Repo | Key Conventions |
|------|----------------|
| **Degreed (.NET)** | Controller → Orchestrator → Service. `ValidateCoachAccessAttribute` for auth. Domain models in `Degreed.Data.Standard/Domain/Coach/`. Named HttpClients with 600s timeout. |
| **fe-workspace (Angular)** | Angular Signals + Facade pattern. NgxHttpClient with auto `/api` prefix. Lazy-loaded routes with guards. Apollo design system. Nx library boundaries. |
| **degreed-coach-builder (Python)** | FastAPI async. Strategy pattern for prompts. `DegreedApiService` + `EndpointRegistry` for .NET callbacks. Redis `SessionDataModel` with 24h TTL. Structured JSON logging with PII masking. |
| **degreed-assistant (Python)** | LangChain chains + tools. `AgentUtils` class for tool methods. Redis-backed `ConversationBufferMemory`. Per-scope prompt templates. |
| **degreed-flutter** | `DegreedCubit<State>` with `safeEmit()` (NOT standard Cubit). Flat module structure. Freezed for immutable states. GetIt DI. `flutter_client_sse` for streaming. |

### 3.2 Security checklist
Before completing implementation, verify:
- No injection vulnerabilities (SQL, command, XSS)
- Auth/access checks at system boundaries (not inferred from UI visibility)
- PII not leaked in logs (Python uses `masking_user_data.py`)
- Guardrail precedence maintained: System > Platform > User

### 3.3 Performance awareness
- Avoid N+1 queries and unnecessary API round-trips
- For performance-sensitive changes → use the `application-profiler` skill to analyze CPU, memory, and execution time
- Python: use `asyncio.gather()` for parallel I/O operations
- .NET: SSE streams must fit within 600s timeout window

---

## Stage 4: Validate

### 4.1 Run tests
```bash
# Run tests for the affected repo(s)
cd Degreed/trunk && ./dg.ps1 t                        # .NET
cd degreed-coach-builder && make test                  # Python Maestro
cd degreed-assistant && make test                      # Python DGA
cd fe-workspace && nx affected -t test                 # Angular
cd degreed-flutter && flutter test                     # Flutter
```

### 4.2 Feature-specific validation
- **Forms agent changes** → use the `forms-test` skill to run live API scenarios via `scripts/forms_chat.py`
- **Mobile changes** → verify the Flutter module has matching functionality (check `lib/` for the corresponding feature module)
- **Cross-repo changes** → trace the full flow manually: frontend call → .NET controller → orchestrator → Python endpoint → response

### 4.3 Self-review
Before presenting the change:
- Review your own diff for security issues, missing error handling at boundaries, and test coverage
- Verify no unintended files are included (`.env`, credentials, large binaries)
- Confirm the change works for both learner and Studio surfaces if applicable

---

## Stage 5: Document

### 5.1 Code documentation
- Add comments only where logic isn't self-evident
- Update existing documentation if the change affects setup, configuration, or architecture

### 5.2 Project documentation
- For significant features → create or update docs in `docs/` following the 3-digit ID convention (e.g., `docs/architecture/002-*.md`)
- For architectural decisions → use the `adr` skill

---

## Quick Reference: Which Skill When

| Situation | Skill to Load |
|-----------|---------------|
| Need full platform architecture | `degreed-architecture` |
| Working in .NET backend | `degreed-dotnet-stack` |
| Working in Python Maestro service | `degreed-coach-builder-stack` |
| Working in Python DGA service | `degreed-assistant-stack` |
| Working in Angular frontend | `degreed-frontend-stack` |
| Working in Flutter mobile | `degreed-flutter-stack` |
| Coach/Quiz/Roleplay/Forms features | `degreed-experiences-feature` |
| Maestro Studio (admin/builder) | `degreed-experience-builder-feature` |
| DGA quick actions | `degreed-assistant-feature` |
| Architectural decision | `adr` |
| Performance optimization | `application-profiler` |
| Third-party library usage | `get-api-docs` |
| AI prompt work | `prompt-lookup` |
| Testing Forms agent | `forms-test` |
