# Maestro Skills — Port Index

The Maestro (Degreed "ai_native") skills ported into this superpowers fork. The port is **not** a file copy: every skill was re-typed by *species* and wired to run **on** the superpowers engine instead of as a parallel stack.

## What the port adds: 3 new discipline skills

These are general superpowers-style disciplines distilled from Maestro's hard-won operational rules. Superpowers did **not** have them; they are authored the superpowers way (Iron Law + rationalization table built from real, observed failure modes + SDO description + composition refs). They are useful far beyond Degreed.

| Skill | Iron Law | Distilled from |
|-------|----------|----------------|
| `plan-adherence` | No code that deviates from the plan without amending the plan first | Maestro's Plan Discipline / Anti-Drift Contract |
| `multi-model-validation` | No BLOCKED/APPROVED verdict or high-stakes correctness claim without independent confirmation | Maestro-Critic's mandatory multi-model validation |
| `research-before-implementing` | Search for what exists before you create; extend before you duplicate | Maestro's Existing-Pattern-Inventory + extend-first + external-research rules |

## The composition model

Maestro is now a **domain layer on the superpowers engine**. The runbooks supply Degreed-specific knowledge (repos, stacks, pipeline phases) and *invoke* the disciplines at the right step rather than re-implementing them:

| Runbook phase | Composes (superpowers) |
|---------------|------------------------|
| `dev-pipeline` | research-before-implementing → brainstorming → writing-plans → test-driven-development + plan-adherence → verification-before-completion |
| `feature-builder` | research-before-implementing + subagent-driven-development + dispatching-parallel-agents + using-git-worktrees + plan-adherence + multi-model-validation |
| `feature-research` | research-before-implementing + dispatching-parallel-agents |
| `feature-approaches` | using-git-worktrees + dispatching-parallel-agents + plan-adherence |
| `adr` | brainstorming → writing-plans |
| `feature-review` | receiving-code-review + plan-adherence (the Phase-3.5 gate) + multi-model-validation (before any BLOCKED) |
| `feature-critic` | multi-model-validation + verification-before-completion |
| `feature-document` / `feature-deploy` / `feature-live-test` | verification-before-completion |
| `application-profiler` | systematic-debugging |
| `get-api-docs` | research-before-implementing |

Every ported skill's `description` was rewritten to obey **SDO** ("Use when …" triggers only — never a workflow summary), so the bootstrap engine can actually discover it.

## Catalog by species

**Disciplines (new):** `plan-adherence` · `multi-model-validation` · `research-before-implementing`

**Pipeline runbooks:** `dev-pipeline` · `feature-builder` · `feature-intake` · `feature-research` · `feature-approaches` · `adr` · `feature-review` · `feature-critic` · `feature-document` · `feature-deploy` · `feature-live-test` · `feature-test-gen` · `a11y-review` · `onboarding`

**Tools:** `application-profiler` · `get-api-docs` · `prompt-lookup` · `slack-lists` · `feature-datadog-monitor`

**Reference (Degreed domain knowledge — lean, no discipline scaffolding):** `degreed-architecture` · `degreed-dotnet-stack` · `degreed-frontend-stack` · `degreed-flutter-stack` · `degreed-coach-builder-stack` · `degreed-assistant-stack` · `degreed-experiences-feature` · `degreed-experience-builder-feature` · `degreed-assistant-feature` · `degreed-design-system` · `dev-analytics-stack`

**Test harnesses (live-API scenario runners):** `team-context-test` · `test-ask-maestro` · `test-coach-chat` · `test-coach-create` · `test-coach-voice` · `test-degreed-assistant` · `test-forms` · `test-multi-persona-voice` · `test-quiz-attempt` · `test-roleplay-e2e` · `test-translate-experience`

> Degreed-specific runbooks/hooks carry workspace identifiers (Jira cloudId, Confluence space id, repo names) and assume the 5-repo Maestro workspace. They are opt-in; see `MAESTRO.md` at the repo root for wiring and the hooks decoupling note.
