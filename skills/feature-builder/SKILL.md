---
name: feature-builder
description: "AI Native Feature Builder — orchestrates the full pipeline from Jira Epic to implementation PRs, Confluence documentation, and auto-generated test skills. Use when the user provides a Jira Epic ID and wants to build the feature end-to-end, or says 'build feature', 'implement epic', or 'work on this epic'."
---

# AI Native Feature Builder

Orchestrate the full feature development pipeline from a Jira Epic through research, architecture decisions, multi-approach implementation, documentation, and test skill generation.

## Agent Architecture

This skill is loaded by the `maestro-conductor` agent (`.claude/agents/maestro-conductor.md`) which orchestrates the pipeline by spawning specialist agents:

| Agent | File | Role | Model |
|-------|------|------|-------|
| `maestro-conductor` | `.claude/agents/maestro-conductor.md` | Pipeline orchestrator, phase transitions, checkpoints | Sonnet |
| `maestro-triage` | `.claude/agents/maestro-triage.md` | Routes input to the right workflow | Sonnet |
| `maestro-researcher` | `.claude/agents/maestro-researcher.md` | Phase 1 deep research, all-layer scan | Opus |
| `maestro-critic` | `.claude/agents/maestro-critic.md` | Devil's Advocate after every phase | Sonnet |
| `maestro-implementer` | `.claude/agents/maestro-implementer.md` | Phase 3 implementation (spawned N times, worktree isolated) | Opus |
| `maestro-reviewer` | `.claude/agents/maestro-reviewer.md` | Phase 3.5 code review, read-only | Sonnet |
| `maestro-doc` | `.claude/agents/maestro-doc.md` | Phase 4 SDD + Confluence docs | Sonnet |

The skill below contains the FULL phase instructions that agents reference. It is the source of truth for pipeline behavior.

## When to Use

- User provides a Jira Epic ID (e.g., `PD-1234`) and wants the full pipeline
- User says "build feature", "implement this epic", "work on this feature"
- User wants to go from ticket to PRs + documentation automatically

## Prerequisites

- Atlassian MCP server connected (for Jira + Confluence)
- Git access to all workspace repos
- GitHub CLI (`gh`) for PR creation

## Self-Enforcement — Phase Discipline Cross-References

This pipeline is self-enforcing. Read these rules before running ANY phase — they're enforced by hooks and `phase-verify.sh`:

- **Phase-Completion Contracts** (`.claude/rules/feature-pipeline.md` § Phase-Completion Contracts) — every phase exit requires `phase-verify.sh {feature} {phase}` to return exit 0.
- **Scope-Change Re-Validation** (same file) — any approach/layer/requirement change mid-pipeline triggers a critic re-run on the prior phase.
- **Intake Modes** (`.claude/rules/feature-pipeline.md` § Greenfield vs Continuation Intake Modes) — declare mode in tracker §0 before Phase 1.
- **User Directive Conflict Gate** — never silently derive a requirement that contradicts a verbatim user directive; surface as blocking checkpoint.
- **Plan Discipline Hook** — `Edit`/`Write` tool calls against `docs/plans/*-plan.md` are BLOCKED unless invoked from the `update-plan` skill (PreToolUse hook).
- **Skill Invocation Log** — every Skill call is logged to `docs/builds/{FEATURE-ID}-skills.log` automatically (PostToolUse hook). Audit-trail for the user.

### Phase 0 — Self-Verification Step

Run BEFORE declaring Phase 0 done:

```bash
.claude/scripts/phase-verify.sh {EPIC-ID} 0
```

Exit 0 means tracker is in shape; exit 1 means fix mismatches/blockers first.

### Per-Phase Verification

Run `.claude/scripts/phase-verify.sh {EPIC-ID} {N}` at the END of EVERY phase. Refuse to advance if exit != 0. Surface the JSON output to the user and fix the blockers before proceeding.

## Constants

```
JIRA_CLOUD_ID = "151636d7-9099-4803-a108-4f053f36c9fe"
JIRA_INSTANCE = "degreedjira.atlassian.net"
CONFLUENCE_SPACE_KEY = "~712020a0b63342badc4b25ab05e1dc1cb61a3d"
CRITIC_MODE = "advisory"  # "advisory" (default) or "gatekeeper"
```

---

## Maestro-Critic Integration

**After EVERY phase completes**, before presenting the checkpoint to the user, launch the `feature-critic` agent to review the phase output.

```python
# After phase work is done, BEFORE showing checkpoint:
Agent({
  description: "Maestro-Critic: Review Phase {N}",
  model: "opus",
  prompt: """You are Maestro-Critic — Devil's Advocate...
  [full context: phase output, requirements, build tracker]
  [see feature-critic skill for complete prompt template]"""
})
```

**Critic mode** (configurable):
- **`advisory`** (default) — Critic findings shown alongside phase results. Pipeline proceeds to user checkpoint regardless.
- **`gatekeeper`** — If critic finds BLOCKERS, pipeline stops. User must acknowledge ("fix it" or "override — I accept the risk") before proceeding.

**To set mode:** User says "make the critic a gatekeeper" or "critic is advisory only" at any point. Or set `CRITIC_MODE` at the start of the pipeline.

**Checkpoint format with critic:**
```
Phase {N} Complete: {name}
{normal phase output}

---
Maestro-Critic Review
Verdict: {APPROVED / APPROVED WITH WARNINGS / BLOCKED}
Blockers: {count or "None"}
Warnings: {count}
{findings summary}
---

What would you like to do?
...
```

---

## Interaction Model — IMPORTANT

The pipeline is **checkpoint-driven**. After EVERY phase completes:

1. **Run Maestro-Critic** — the critic agent reviews the phase output (see above)
2. **STOP and present results** — show what was done, what the critic found
2. **WAIT for user input** — do NOT auto-advance to the next phase
3. **Accept user direction** — the user may:
   - **Approve and proceed:** "looks good, continue" → advance to next phase
   - **Request changes:** "can you also try X approach" or "add this requirement" → **re-run the current phase** with the new input incorporated
   - **Add context:** "also consider this Confluence page" or "check this ticket too" → incorporate and update the current phase's output
   - **Skip a phase:** "skip the review, go to documentation" → jump ahead
   - **Modify approaches:** "I like A and B, replace C with this idea: ..." → update the ADR and implementation plan before launching agents
   - **Re-run a phase:** "the research missed the Flutter side, redo it" → re-execute with broader scope
   - **Stop the pipeline:** "that's enough for now" → save state, post progress to Jira

**Example interactions at the ADR checkpoint:**
```
Claude: I've defined 3 approaches:
  A: Strategy pattern with new prompt strategy
  B: Middleware hook on the SSE pipeline
  C: Event-driven with Redis pub/sub

  Should I implement all 3 as PRs, or do you want to adjust?

User: "Can you also try an approach using LangGraph instead of the strategy pattern?"

Claude: Sure — I'll replace Approach C with a LangGraph-based approach.
        Let me update the ADR... [re-runs Phase 2 with the new approach]
        [presents updated 3 approaches]
        Ready to implement. Proceed?

User: "Yes, but only implement A and the LangGraph one fully. Sketch B as a draft."

Claude: Got it. Launching:
  - Maestro-Alpha: Full implementation of Approach A
  - Maestro-Beta: Draft/sketch implementation of Approach B
  - Maestro-Gamma: Full implementation of Approach C (LangGraph)
```

### Task List Management

**Maintain a structured task list throughout the ENTIRE session** using `TaskCreate` and `TaskUpdate`. This is NOT optional — it's how the user tracks what's happening.

**At Phase 0 (pipeline start):** Create tasks for ALL phases:
```
TaskCreate: "Phase 0: Intake — {feature name}"          → status: in_progress
TaskCreate: "Phase 1: Deep Research"                     → status: pending
TaskCreate: "Phase 2: Architecture Decision (ADR)"       → status: pending
TaskCreate: "Phase 3: Implementation"                    → status: pending
TaskCreate: "Phase 3.5: Code Review"                     → status: pending
TaskCreate: "Phase 4: SDD Documentation"                 → status: pending
TaskCreate: "Phase 5: Test Skill Generation"             → status: pending
TaskCreate: "Phase 6: Deploy"                            → status: pending
TaskCreate: "Phase 7: Live Testing"                      → status: pending
TaskCreate: "Phase 8: Datadog Monitoring"                → status: pending
```

**Phase lifecycle:**
- When starting a phase: `TaskUpdate(taskId, status: "in_progress")`
- When phase completes: `TaskUpdate(taskId, status: "completed")`
- When user skips a phase: `TaskUpdate(taskId, status: "completed", subject: "Phase N: {name} — SKIPPED")`
- When user re-runs a phase: `TaskUpdate(taskId, status: "in_progress", subject: "Phase N: {name} (re-run #{count})")` — do NOT create a new task, update the existing one
- When a phase fails: keep it `in_progress`, note the failure in description

**Sub-tasks within phases:** For long phases (like Phase 3 with multiple agents), create sub-tasks:
```
TaskCreate: "[Maestro-Alpha] Implement strategy-pattern approach"
TaskCreate: "[Maestro-Beta] Implement langgraph-agent approach"
TaskCreate: "[Maestro-Gamma] Implement middleware-hook approach"
```

**Rules:**
- ALWAYS mark a task `in_progress` BEFORE starting work on it
- ALWAYS mark a task `completed` immediately when done — don't batch
- The task list should reflect the CURRENT state at all times
- If the user says "skip to Phase 4", mark phases 2 and 3 as completed with "SKIPPED" suffix
- If the user says "redo research", update Phase 1's task back to `in_progress` and add "(re-run #2)" to the subject
- Clean up stale tasks — if old tasks from previous pipeline phases exist, delete them at pipeline start

---

### Phase Completion Contract

When a phase completes, Claude MUST:
1. **Update the task list** — mark the current phase task as `completed`
2. **Deliver ALL artifacts** for that phase (docs written, files created)
3. **Update the build tracker** (local) — `docs/builds/{EPIC-ID}-{feature}.md`
4. **Publish FULL content to Confluence** — NOT a summary, NOT a link to local files. The Confluence child page must contain the COMPLETE document content so anyone with wiki access can read it without needing the local repo. Write/update the page via `updateConfluencePage` with `contentFormat: "markdown"` and the FULL markdown content.
5. **Post to Jira** — comment on the Epic with Confluence page links (NOT local file paths)
6. **Run Maestro-Critic** — the Devil's Advocate reviews the phase output
7. **Send phone notification** — fire `.claude/scripts/notify.sh "Phase {N} done · {feature}" "{1-line summary}" default robot "<jira-or-confluence-url>"`. See `.claude/rules/feature-pipeline.md` § Phone Notifications for the canonical priority/title matrix per phase.
8. **Present a structured summary** to the user showing what was done + critic findings
9. **List possible next actions** — what the user can do
10. **WAIT** — do not proceed until the user responds

**CRITICAL — Confluence pages must be COMPLETE, not stubs:**
- The research doc on Confluence must have ALL sections — impact analysis, building blocks, data inventory, edge cases, external research findings. Not "see docs/plans/004-research.md".
- The ADR on Confluence must have ALL approaches, ALL scores, ALL diagrams. Not "see docs/architecture/002.md".
- The build tracker on Confluence must be the SAME content as the local file — updated after every phase.
- Other people on the team will read these Confluence pages. If the content is "stored locally", they can't see it. The Confluence page IS the document.

### Build Tracker Document

A living markdown file at `docs/builds/{EPIC-ID}-{feature-name}.md` tracks the full pipeline state. It is:
- **Created** at Phase 0 (Intake) from the template at `docs/builds/_TEMPLATE.md`
- **Updated** after EVERY phase with results, artifacts, and user feedback
- **The single source of truth** for what has been done in this pipeline run
- **Resumable** — if someone starts a new Claude session, this doc tells them where things stand

The build tracker records:
- Pipeline progress table (which phases done, which pending)
- Confluence wiki folder with page IDs for each document
- Jira ticket IDs (requirement-based, not phase-based)
- All artifact links (research doc, ADR, PRs, SDD, test skill)
- API contracts defined during implementation
- User feedback captured at each checkpoint
- Maestro-Critic review verdicts per phase
- Decision log (chronological record of key decisions and why)

### Confluence Wiki Folder

Every pipeline run creates a **Confluence folder** (parent page with child pages):
- **Created** at Phase 0 — parent page: `{EPIC-ID} — {Feature Name}`
- **Child pages** are the FULL documents — not summaries, not links to local files
- **Updated** after every phase with the COMPLETE content (same as local file)
- **Linked** from Jira comments and PR descriptions
- Space ID: `5895915199`

**The Confluence page IS the document.** The local file in `docs/` is a git-tracked backup. When someone reads the research doc, ADR, or build tracker — they read it on Confluence. If the Confluence page says "see local file at docs/plans/004.md", that's a BUG.

**What to publish as Confluence child pages:**
| Phase | Child Page Title | Content |
|-------|-----------------|---------|
| Phase 1 | `Research — {EPIC-ID}` | FULL research document: all 15 sections, impact matrix, building blocks, external research, edge cases |
| Phase 2 | `ADR — {EPIC-ID}` | FULL ADR: all approaches brainstormed, top N scored, diagrams, dissenting opinions |
| Phase 3 | `Build Tracker — {EPIC-ID}` | FULL tracker: progress table, tickets, PRs, deployment, test results — updated after every phase |
| Phase 4 | `SDD — {Feature Name}` | FULL Solution Design Document (Degreed AG template) |

### Jira Tickets — Requirement-Based

Tickets represent DELIVERABLE WORK, not pipeline phases:
- **Ask user first** before creating any tickets
- Propose requirement-based Tasks, Stories, Spikes — not phase-tracking tickets
- User can choose: create all, create specific ones, or track locally only
- Tickets can be created at ANY checkpoint, not just Phase 0

---

## Pipeline Execution

### Step 1: Parse Input

The pipeline accepts ANY of these as input:

| Input Type | Example | How to Handle |
|-----------|---------|---------------|
| **Jira Epic ID** | `PD-1234` | Fetch via `getJiraIssue`, full pipeline |
| **Jira URL** | `https://degreedjira.atlassian.net/browse/PD-1234` | Extract ID, fetch, full pipeline |
| **Jira ticket (non-Epic)** | `PD-5678` (Story/Task/Bug) | Fetch it, adapt pipeline (likely single approach, no sub-tasks on Stories) |
| **One-liner description** | "Add a toggle to enable team context in coach" | No Jira ticket — user describes the feature directly |
| **Bug description** | "SSE disconnects when team context > 30KB" | No ticket — treat as bug investigation + fix |
| **Confluence page link** | `https://degreedjira.atlassian.net/wiki/...` | Fetch the page, extract requirements from it |

**For one-liner / no-ticket input:**

When the user provides a description instead of a ticket ID:
1. **Use the description as the requirement source** — skip the Jira fetch, go straight to extracting requirements from what the user said
2. **Ask clarifying questions** if the one-liner is ambiguous:
   > You said: "{one-liner}". Before I start research, let me clarify:
   > - Which repos does this touch? (coach-builder, .NET, frontend, flutter?)
   > - Is this a new feature, enhancement, or bug fix?
   > - Is there a Jira ticket for this, or should I create one?
   > - Any Confluence pages or design docs I should read?
3. **Create the build tracker** with the description as the title (no EPIC-ID prefix)
4. **Create the Confluence wiki folder** with a descriptive title
5. **Offer to create a Jira ticket** at the Phase 0 checkpoint:
   > I can create a Jira Epic/Task for this if you want to track it formally. Otherwise I'll track locally in the build tracker.
6. **Proceed with the pipeline normally** — research, ADR, implementation, etc. all work the same way

**The pipeline adapts to the input — it doesn't require a Jira Epic to start.**

---

### Step 2: Run Phase 0 — Intake

Load and execute the `feature-intake` skill instructions:

0. **Create the build tracker** — Copy `docs/builds/_TEMPLATE.md` to `docs/builds/{EPIC-ID}-{feature-name}.md`. Fill in the Epic ID, title, start date. Set Phase 0 to "in-progress". This file is updated after EVERY phase from now on.
1. **Fetch the Epic** — Use `mcp__atlassian__getJiraIssue` with the Epic ID
2. **Follow ALL links:**
   - Linked Jira issues → fetch each via `getJiraIssue`
   - Confluence pages in description/comments → fetch via `getConfluencePage`
   - External URLs → fetch via `WebFetch`
3. **Read ALL comments** on the Epic
4. **Extract requirements** — Create a structured list of:
   - Functional requirements
   - Acceptance criteria
   - Affected systems/repos
   - Constraints and dependencies
   - Stakeholders mentioned
5. **Post planning comment** on the Epic via `mcp__atlassian__addCommentToJiraIssue`:
   ```
   *AI Feature Builder — Planning Summary*

   *Requirements Understood:*
   1. [requirement 1]
   2. [requirement 2]
   ...

   *Affected Systems:* [list repos]
   *Dependencies:* [list]
   *Questions/Ambiguities:* [list, if any]

   *Pipeline Status:* Intake complete. Starting deep research.
   _Next phases: Deep Research → ADR → 3 Implementation Approaches → Confluence Doc → Test Skill_
   ```
6. **Create sub-tasks** via `mcp__atlassian__createJiraIssue` (type: Sub-task, parent: Epic ID):
   - `[AI] Deep Research — {Epic summary}`
   - `[AI] Architecture Decision — {Epic summary}`
   - `[AI][Maestro-Alpha] Approach A — {Epic summary}`
   - `[AI][Maestro-Beta] Approach B — {Epic summary}`
   - `[AI][Maestro-Gamma] Approach C — {Epic summary}`
   - `[AI] Code Review & Validation — {Epic summary}`
   - `[AI] Documentation — {Epic summary}`
   - `[AI] Test Skill — {Epic summary}`

**Checkpoint — STOP AND WAIT:**

Present the full intake summary, then ask:

> **Phase 0 Complete: Intake**
>
> - {N} requirements extracted
> - {M} linked resources analyzed
> - 8 sub-tasks created on {EPIC-ID}
> - Planning comment posted to Jira
>
> **What would you like to do?**
> - "proceed" → Start Phase 1: Deep Research
> - "add [requirement/link/context]" → I'll incorporate it and update the plan
> - "adjust [sub-tasks/requirements]" → I'll modify before moving on
> - "stop" → Pipeline paused, all progress saved to Jira

---

### Step 3: Run Phase 1 — Deep Research

Load and execute the `feature-research` skill instructions:

1. **Cross-repo impact scan** — For each requirement, search ALL 5 repos:

   **degreed-coach-builder (Python Maestro):**
   - Search `backend/app/api/` for affected endpoints
   - Search `backend/app/llm/` for prompt/LLM changes
   - Search `backend/app/realtime/` if voice is involved
   - Search `backend/app/quiz/` if quiz/forms are involved
   - Search `backend/app/post_process/` if extraction is involved
   - Search `backend/app/dg_component/api_service/` for .NET callback changes

   **Degreed (.NET):**
   - Search `trunk/Degreed.Web.vNext/Controllers/Api/` for controller changes
   - Search `trunk/Degreed.Common.Standard/Orchestrators/` for orchestrator changes
   - Search `trunk/Degreed.Common.Standard/Constants/CoachAIBackendRoutes.cs` for route definitions
   - Search `trunk/Degreed.Data.Standard/Domain/Coach/` for domain model changes
   - Search `trunk/Degreed.SqlDb/aicoach/` for database schema changes

   **fe-workspace (Angular):**
   - Search `apps/lxp/src/app/degreed-coach/` for coach UI changes
   - Search `apps/lxp/src/app/maestro-studio/` for builder UI changes
   - Search `apps/lxp/src/app/maestro-quiz/` for quiz UI changes
   - Search `apps/lxp/src/app/maestro-roleplay/` for roleplay UI changes

   **degreed-flutter:**
   - Search `lib/coach_chat/` for mobile coach changes
   - Search `lib/mobile_coach/` for voice changes
   - Search `lib/quiz/` for quiz changes
   - Search `lib/degreed_assistant/` for DGA changes

   **degreed-assistant (only if DGA is in scope):**
   - Search `backend/genai/tools_and_chains/agent_utils.py` for tool changes

2. **Map dependencies** — For each affected file, find what imports/references it
3. **Search related Jira tickets** via `mcp__atlassian__searchJiraIssuesUsingJql`
4. **Check Datadog baselines** if performance-relevant (via `mcp__datadog__get_logs`, `mcp__datadog__list_traces`)
5. **Write research document** to `docs/plans/{next-id}-{feature}-research.md` (local git backup)
6. **Publish FULL research document to Confluence** — Create/update the `Research — {EPIC-ID}` child page under the wiki folder with the COMPLETE content (all 15 sections). Do NOT write a summary or link to the local file. Use `createConfluencePage` or `updateConfluencePage` with `contentFormat: "markdown"` and paste the entire markdown content as the body.
7. **Update Jira** — Comment on Epic with the Confluence research page link (NOT local file path)

**Checkpoint — STOP AND WAIT:**

> **Phase 1 Complete: Deep Research**
>
> - Impacts across {N} repos, {M} files
> - Dependency impact matrix: {breaking changes count}
> - Research document: `docs/plans/{id}-research.md`
> - Jira sub-task updated
>
> **Key findings:**
> {top 3-5 findings with risk levels}
>
> **What would you like to do?**
> - "proceed" → Start Phase 2: Architecture Decision (define 3 approaches)
> - "also check [area/repo/ticket]" → I'll expand the research and update the doc
> - "dig deeper into [specific area]" → I'll do focused investigation
> - "stop" → Pipeline paused, research saved

---

### Step 4: Run Phase 2 — Architecture Decision

Use the existing `adr` skill enhanced with multi-model reasoning and visual diagrams:

1. **Brainstorm ALL viable approaches** — Don't limit to exactly 3. Think broadly:
   - What patterns could solve this? (Strategy, middleware, event-driven, agent-based, etc.)
   - What have similar products done? (from Phase 1 external research)
   - What existing building blocks suggest a natural path? (from Phase 1 reuse inventory)
   - What did reverted PRs try that could be improved? (from Phase 1 PR history)
   - What did the user suggest?
   
   List every approach considered, even ones quickly ruled out. The ADR captures ALL thinking, not just the final 3.

2. **Narrow to the top 3 for implementation** — From all approaches brainstormed, select the 3 most viable. For the ones NOT selected, write a brief "why not" in the ADR:
   ```markdown
   ## Approaches Considered But Not Pursued
   - **{Approach X}: {name}** — Ruled out because: {specific reason}
   - **{Approach Y}: {name}** — Ruled out because: {specific reason}
   ```
   This way every idea is captured even if only 3 go to implementation.

3. **The number 3 is a default, not a rule.** The user can:
   - "just implement 2 approaches" → fewer worktrees
   - "I want 4 approaches including this one" → more worktrees
   - "just implement one" → single branch, no worktrees needed
   - "implement A fully, sketch B and C as drafts" → mixed depth
   
   Adjust worktree count and agent count to match.

4. **Use `mcp__pal__thinkdeep`** to reason deeply about each approach
5. **Use `mcp__pal__consensus`** (3+ models) for multi-model evaluation — each model argues for/against/neutral on each approach
6. **Use `mcp__pal__challenge`** to stress-test the recommended approach with critical analysis
7. **Produce a weighted score matrix** in the ADR for all approaches going to implementation:
   ```
   | Criteria (weight)         | Approach A | Approach B | Approach C |
   |--------------------------|-----------|-----------|-----------|
   | Maintainability (25%)    | 8/10      | 6/10      | 9/10      |
   | Performance (20%)        | 7/10      | 9/10      | 6/10      |
   | Implementation risk (20%)| 9/10      | 5/10      | 7/10      |
   | Reversibility (15%)      | 8/10      | 4/10      | 8/10      |
   | Team familiarity (10%)   | 9/10      | 7/10      | 5/10      |
   | Test coverage ease (10%) | 7/10      | 8/10      | 6/10      |
   | WEIGHTED TOTAL           | 8.0       | 6.5       | 7.2       |
   ```
   Include dissenting opinions from models that argued against the recommendation.
8. **Generate Mermaid sequence diagrams** for each approach showing the request flow:
   ```mermaid
   sequenceDiagram
       Browser->>Angular: User action
       Angular->>+.NET Controller: POST /api/feature/action
       .NET Controller->>+Python FastAPI: POST /dgcb/api/feature/action
       Python FastAPI->>Azure OpenAI: LLM call
       Azure OpenAI-->>Python FastAPI: Response
       Python FastAPI-->>.NET Controller: JSON/SSE
       .NET Controller-->>Angular: Response
   ```
   Include diagrams inline in the ADR. Generate one per approach if the data flow differs.
9. **Write ADR** to `docs/architecture/{next-id}-{feature}.md` (local git backup)
10. **Publish FULL ADR to Confluence** — Create/update the `ADR — {EPIC-ID}` child page with the COMPLETE ADR content: all approaches brainstormed, ruled-out approaches with reasons, top N with scored matrix, diagrams, dissenting opinions. Use `contentFormat: "markdown"` with the full markdown.
11. **Create a Detailed Implementation Plan PER selected approach** — MANDATORY. The ADR is high-level; this plan is the file-by-file contract the implementer follows.
    - **One plan file per selected approach:** `docs/plans/{EPIC-ID}-{approach-short-name}-plan.md`
    - **Use the template:** copy `docs/plans/_PLAN_TEMPLATE.md` and fill in every section
    - **Required content** (per the template):
      - **Summary** (always-re-readable header): goal, pattern, layer order, file count
      - **Current State** (updated as work progresses): last completed step, currently working, blockers
      - **Existing Pattern Citations** (pulled from Phase 1's Existing Pattern Inventory) with file:line references
      - **Step-by-step plan** with EXACT file paths, EXACT function/class signatures, EXACT data shapes (copy from .NET orchestrators), test cases per step, definition of done per step
      - **Migration order** if shipping requires sequencing
      - **Amendments Log** (initially empty)
      - **Out-of-Scope** explicit non-goals so the implementer doesn't drift
      - **Open Questions** for things the user must decide before Phase 3 starts
    - **Plans are committed BEFORE Phase 3 starts.** Each plan file gets its own commit on `main` so the implementer agent in its worktree can pull it.
    - **Plans are mirrored to Confluence** as child pages of the build tracker. Path: `Plan — {approach-name} — {EPIC-ID}`.
12. **Update Jira** — Comment on Epic with the Confluence ADR page link AND links to all detailed plan pages

**Checkpoint — STOP AND WAIT (most interactive checkpoint):**

> **Phase 2 Complete: Architecture Decision**
>
> **Approaches brainstormed:** {total count} | **Selected for implementation:** {N}
>
> {For each selected approach:}
> **Approach {letter}:** {name} — {1-line summary} (score: {X}/10)
>
> **Also considered but ruled out:**
> - {approach}: {1-line reason why not}
>
> ADR document: `docs/architecture/{id}.md`
>
> **What would you like to do?**
> - "proceed with all {N}" → Launch parallel worktree agents
> - "also try [your idea]" → I'll add it as another approach
> - "drop [approach]" → I'll remove it, fewer agents needed
> - "replace {X} with [idea]" → I'll swap it in the ADR
> - "just implement {one}" → Single approach, no worktrees
> - "rethink — I want different approaches" → Re-run Phase 2
> - "can you also try [new approach]?" → I'll add/replace an approach in the ADR
> - "only implement A and B fully, sketch C" → A and B get full PRs, C gets a draft PR
> - "just implement A" → Single approach mode, skip multi-approach
> - "I have a different idea entirely..." → I'll rethink and re-run this phase
> - "stop" → Pipeline paused, ADR saved

---

### Step 5: Run Phase 3 — Multi-Approach Implementation

Load and execute the `feature-approaches` skill instructions:

**For each approach (A, B, C):**

1. **Create feature branch** in each affected repo:
   ```
   feature/{epic-id}-approach-{a|b|c}-{short-name}
   ```

2. **Implement** following repo conventions (load appropriate stack skill):
   - Write the code changes
   - Write unit tests
   - Run tests to verify: `make test` (Python), `./dg.ps1 t` (.NET), `nx affected -t test` (Angular), `flutter test` (Flutter)

3. **Create PR** via `gh pr create`:
   ```
   Title: feat: {short description} (Approach {A|B|C} for {EPIC-ID})
   Body:
   ## Summary
   Approach {A|B|C} for {Epic summary}
   **Jira:** {EPIC-ID}
   **ADR:** {link to ADR}

   ## Changes
   - {bullet list}

   ## Test Plan
   - [ ] Unit tests
   - [ ] {feature-specific checks}
   ```

4. **Update the approach sub-task** in Jira:
   - Add PR link(s)
   - Add implementation summary
   - Transition status via `transitionJiraIssue`

**Checkpoint — STOP AND WAIT:**

> **Phase 3 Complete: Implementation**
>
> **[Maestro-Alpha] Approach A:** {name}
> - PRs: {links per repo}
> - Tests: {pass/fail}
>
> **[Maestro-Beta] Approach B:** {name}
> - PRs: {links per repo}
> - Tests: {pass/fail}
>
> **[Maestro-Gamma] Approach C:** {name}
> - PRs: {links per repo}
> - Tests: {pass/fail}
>
> **What would you like to do?**
> - "proceed to review" → Run Phase 3.5: Code Review & Dependency Validation
> - "approach A needs [change]" → I'll update the PR and re-run tests
> - "can Maestro-Alpha also add [feature]?" → I'll extend that approach
> - "drop approach B" → I'll close the PR and mark the sub-task accordingly
> - "skip review, go to docs" → Jump to Phase 4
> - "stop" → Pipeline paused, all PRs saved

---

### Step 5.5: Run Phase 3.5 — Code Review & Dependency Validation

Load and execute the `feature-review` skill instructions:

This phase validates ALL implementations before documentation. It runs AFTER all 3 agents complete.

1. **Cross-project dependency validation** — For each approach:
   - Classify every modified file (new vs existing, intra-project vs cross-project)
   - For existing module changes, trace the full dependency chain across all 5 repos
   - Verify API contracts match between Python ↔ .NET ↔ Angular ↔ Flutter
   - Flag any breaking changes that weren't caught during implementation

2. **Code standards review per repo:**
   - **.NET:** Verify .NET 8 / C# 11 compliance, async patterns, SOLID, Controller→Orchestrator→Service
   - **Angular:** Verify Angular 20, Signals, NgxHttpClient, standalone components
   - **Python:** Verify Python 3.12, FastAPI async, Strategy pattern, type annotations
   - **Flutter:** Verify Flutter 3.35, DegreedCubit+safeEmit, Freezed, GetIt DI

3. **Apollo component check (fe-workspace):**
   - For each UI component used, check if an Apollo equivalent exists in `libs/apollo/`
   - Check docs at `apps/lxp-docs/src/app/docs/apollo/`
   - **If no Apollo component exists** → post a Jira comment on the Epic:
     ```
     [Agent Maestro-Review] Apollo Component Gap: {component type}
     No Apollo equivalent found. Used {alternative}. Recommend creating Apollo component.
     ```

4. **Optimization review** — Use `mcp__pal__analyze` for automated check
5. **Security audit** — Use `mcp__pal__secaudit` on changed files
6. **Fix blockers** if found, re-run tests
7. **Post review report** on each approach sub-task in Jira

**Checkpoint — STOP AND WAIT:**

> **Phase 3.5 Complete: Code Review & Validation**
>
> | Approach | Standards | Dependencies | Apollo | Security | Verdict |
> |----------|-----------|-------------|--------|----------|---------|
> | A (Alpha) | {pass/fail} | {ok/issues} | {ok/gaps} | {pass/fail} | {PASS/FAIL} |
> | B (Beta)  | {pass/fail} | {ok/issues} | {ok/gaps} | {pass/fail} | {PASS/FAIL} |
> | C (Gamma) | {pass/fail} | {ok/issues} | {ok/gaps} | {pass/fail} | {PASS/FAIL} |
>
> {If blockers: list them}
> {If Apollo gaps: list them with Jira comment confirmation}
>
> **What would you like to do?**
> - "proceed to docs" → Start Phase 4: Confluence Documentation
> - "fix the blockers" → I'll fix issues and re-review
> - "tell me more about [specific finding]" → I'll explain in detail
> - "skip to test skill" → Jump to Phase 5
> - "stop" → Pipeline paused, review report saved

---

### Step 6: Run Phase 4 — Confluence Documentation

Load and execute the `feature-document` skill instructions:

1. **Use the default Confluence space** — Space key: `~712020a0b63342badc4b25ab05e1dc1cb61a3d`. All pages are created/edited under this space. Reading from other spaces is fine, but writes MUST go here.
2. **Create page** via `mcp__atlassian__createConfluencePage` with full report:
   - Requirements (Phase 0)
   - Research findings (Phase 1)
   - Architecture decision (Phase 2)
   - All 3 approaches with PR links (Phase 3)
   - Comparison matrix
   - Recommendation
3. **Update Jira Epic** with Confluence page link

---

### Step 7: Run Phase 5 — Test Skill Generation

Load and execute the `feature-test-gen` skill instructions:

1. **Analyze feature API surface** — List all new/modified endpoints
2. **Generate test tool** in `tools/{feature-name}/`:
   - Python CLI inheriting from `tools/_shared/maestro_test_base.py`
   - Config files for environments
3. **Generate SKILL.md** in `.claude/skills/{feature-name}-test/`
4. **Generate test scenarios** (happy path, edge cases, error handling)
5. **Update the Test Skill sub-task** in Jira

---

### Step 8: Run Phase 6 — Deploy to PR Environment

Load and execute the `feature-deploy` skill instructions. **The deploy sequence depends on which layers actually changed** — classify the case first, then run only the steps applicable to that case.

**Case decision tree (full details in `feature-deploy` skill):**

| Case | Layers Changed | Sequence | Test URL |
|------|---------------|----------|----------|
| **1** | FE + .NET + Python | Python → push .NET URL hardcode → FE w/ `be-ref={dotnet-branch}` (auto-deploys .NET) | `lxpfepr{N}.degreed.dev` |
| **2** | .NET + Python | Python → hardcode URL in .NET PR → deploy .NET | `pr{N}.degreed.dev` |
| **3** | Python only | Python → clone `main` in Degreed → temp .NET PR with hardcoded URL → deploy temp PR | `pr{N}.degreed.dev` |
| **4** | FE only | Deploy FE PR (only) — staging .NET + Python | `lxpfepr{N}.degreed.dev` |
| **5** | .NET only | Deploy .NET PR (only) — staging Python + FE | `pr{N}.degreed.dev` |

**Core invariant:** Tests always traverse `pr{N}.degreed.dev` or `lxpfepr{N}.degreed.dev` — Python is never tested directly. Whenever Python has a PR, .NET MUST be redeployed with the Python URL hardcoded (Case 3 needs a temp .NET clone branch).

**Generic operational steps (apply per case):**
1. **Classify the case** — inspect which repos have PRs/changes
2. **Deploy Python** (Cases 1, 2, 3) — edit `prcheck.yml`, push, wait for GitHub Actions
3. **Hardcode Python URL in .NET orchestrators** (Cases 1, 2, 3) — Case 3 first creates a temp .NET clone branch off `main`
4. **Deploy .NET** (Cases 2, 3, 5) — `/deploy environment=Local` on the .NET PR
5. **Deploy Frontend** (Cases 1, 4) — Case 1 uses `be-ref={dotnet-branch}`, Case 4 uses no `be-ref`
6. **Poll** every 60s for "PR Deployment Complete"; auto-retry up to 2× via `gh run rerun {id} --failed`
7. **Smoke test** the resulting URL (health, login, basic API)
8. **Update build tracker** with case used, URLs, temp commits/branches that need revert at Step 9

**Checkpoint — STOP AND WAIT:**

> **Phase 6 Complete: Deployment**
>
> | Repo | URL | Status |
> |------|-----|--------|
> | .NET | {url} | Deployed |
> | Frontend | {url} | Deployed |
> | Python | {url} | {status} |
>
> **App URL:** {frontend URL}
>
> **What would you like to do?**
> - "proceed to testing" → Run test skill against this environment
> - "redeploy" → Re-trigger deployment
> - "stop" → Pipeline paused

---

### Step 9: Run Phase 7 — Live Testing

Load and execute the `feature-live-test` skill instructions:

1. **Configure test tool** with the PR environment URL from Phase 6
2. **Launch testing + monitoring in parallel** (two agents):
   - Agent 1: Run test scenarios (smoke, integration, feature flow, LLM evaluation)
   - Agent 2: Monitor Datadog for errors during tests
3. **Collect evidence** — HTTP responses, pass/fail per scenario, Datadog correlations
4. **Handle failures** — Environment issues (retry) vs code bugs (document + create Jira bug ticket)
5. **Update build tracker and Jira** with test results

**Checkpoint — STOP AND WAIT:**

> **Phase 7 Complete: Live Testing**
>
> | Scenario | Verdict |
> |----------|---------|
> | Smoke | {PASS/FAIL} |
> | Integration | {PASS/FAIL} |
> | Feature flow | {PASS/FAIL} |
> | LLM quality | {PASS/FAIL} |
>
> **Overall: {PASS / FAIL}**
>
> **What would you like to do?**
> - "proceed to monitoring" → Extended Datadog check
> - "fix and re-test" → Debug, fix, re-deploy, re-test
> - "good enough, wrap up" → Go to final summary
> - "stop" → Pipeline paused

---

### Step 10: Run Phase 8 — Datadog Monitoring

Load and execute the `feature-datadog-monitor` skill instructions:

1. **Check logs** for errors in `service:degreed.web.next`, `service:degreed-coach-builder`, `service:degreed-coach-realtime`
2. **Check traces** for latency, failed spans
3. **Check RUM** for frontend JS errors, page performance (if frontend changes)
4. **Compare to Phase 1 baselines** — error rate, latency deltas
5. **Produce health report** and update build tracker

**Checkpoint — STOP AND WAIT:**

> **Phase 8 Complete: Datadog Monitoring**
>
> | Service | Errors | Latency vs Baseline | Health |
> |---------|--------|-------------------|--------|
> | .NET | {count} | {delta} | {OK/ISSUES} |
> | Python | {count} | {delta} | {OK/ISSUES} |
>
> **Overall: {HEALTHY / ISSUES FOUND}**
>
> **What would you like to do?**
> - "select approach and wrap up" → Final summary + cleanup
> - "investigate {error}" → Deep dive into a specific error
> - "re-test" → Go back to Phase 7
> - "stop" → Pipeline paused

**NOTE:** Phases 6-8 form a **validation loop** — they can repeat:
```
Deploy → Test → Monitor → Find issues → Fix → Re-deploy → Re-test → Re-monitor
```

---

### Step 11: Final Summary

Post a final comment on the Jira Epic:
```
*AI Feature Builder — Pipeline Complete*

*Deliverables:*
- Planning comment posted
- Sub-tasks created and updated
- Research document: docs/plans/{id}-{feature}-research.md
- ADR: docs/architecture/{id}-{feature}.md
- 3 implementation PRs:
  - Approach A: {PR link} — {summary}
  - Approach B: {PR link} — {summary}
  - Approach C: {PR link} — {summary}
- SDD (Confluence): {link}
- Test skill: .claude/skills/test-{feature}/
- Deployed & tested on PR environment: {URL}
- Datadog health: {HEALTHY/ISSUES}

*Recommended Approach:* {A|B|C} — {reason}
*Test Results:* {pass}/{total} scenarios passed
*Next Steps:* Select approach for merge.
```

Update the build tracker one final time — mark all phases complete, add the final recommendation, and update the decision log. Include pipeline metrics (see Build Tracker Update Rule).

Present the complete summary to the user.

---

### Step 9: Approach Selection & Cleanup

When the user selects an approach (e.g., "go with Approach A"):

1. **Close abandoned PRs** — For the 2 rejected approaches, in EACH repo:
   ```bash
   gh pr close {pr-number} --comment "Superseded by Approach {selected} (PR #{selected-pr}). Closed by [Agent Maestro-{name}]."
   ```
2. **Delete remote branches** for rejected approaches:
   ```bash
   git push origin --delete feature/{epic-id}-approach-{rejected}-{name}
   ```
3. **Transition Jira sub-tasks** for rejected approaches to "Closed" / "Won't Do" via `mcp__atlassian__transitionJiraIssue`. Add comment:
   ```
   [Agent Maestro-{Beta|Gamma}] Approach {B|C} superseded by Approach {A}. PRs closed.
   ```
4. **Update Confluence page** — Mark the selected approach and grey out the others.
5. **Update build tracker** — Record the selection in the decision log.
6. **Save to pipeline memory** — Use `claude-mem` to record:
   - Which approach style was selected (strategy pattern, middleware, event-driven, etc.)
   - Which repos were affected
   - The feature domain (coach, quiz, voice, forms, etc.)
   - What the user valued (maintainability? performance? simplicity?)
   This builds a pattern history that future pipeline runs can reference.

---

### Pipeline Memory (Cross-Session Learning)

At the START of every pipeline run (Phase 0), before extracting requirements:

1. Search `claude-mem` for past pipeline runs in the same domain area using keywords from the Epic (e.g., "coach", "voice", "quiz").
2. If matches found, surface patterns:
   > "In past pipeline runs for coach-related features, the strategy pattern extension approach was selected 3/4 times. Average pipeline had impacts across 3 repos."
3. Feed these patterns into Phase 2 (ADR) to bias toward historically successful approaches.
4. Record this pipeline run's outcome at Step 9 for future reference.

---

## Build Tracker Update Rule

**EVERY checkpoint** must update `docs/builds/{EPIC-ID}-{feature-name}.md` BEFORE presenting to the user. Specifically:

1. Update the **Pipeline Progress table** — mark the phase as "done", add the date
2. Fill in the **phase section** with results, artifacts, links
3. Capture **user feedback** at the checkpoint — after the user responds, go back and record what they said in the "User feedback at checkpoint" field
4. Add any **decisions** to the Decision Log table at the bottom

This ensures that if someone opens a new Claude session, the build tracker tells them exactly where things stand and what decisions were made.

### Resuming a Pipeline

If the user provides an Epic ID and a build tracker already exists at `docs/builds/{EPIC-ID}-*.md`:
1. Read the build tracker to understand what's been done
2. Find the first phase that is NOT "done"
3. Tell the user: "I found an existing pipeline run. Phases 0-2 are complete. Ready to resume at Phase 3 (Implementation)?"
4. Continue from where it left off

---

## Error Handling

- **Jira API fails:** Report the error, ask user to verify MCP connection. Continue with what's available.
- **Confluence unavailable:** Skip Phase 4, note it in the summary.
- **PR creation fails:** Report the error, provide the branch name for manual PR creation.
- **Test generation incomplete:** Provide what was generated, note gaps for manual completion.
- **User interrupts:** Save state (which phases completed), allow resuming later.

## Slack Notifications (Optional)

If Slack MCP is authenticated (`mcp__plugin_slack_slack__authenticate`), post to a configured channel (e.g., `#maestro-builds`) at each checkpoint:

```
[Feature Builder] PD-1234 — Phase 2 Complete: ADR
3 approaches defined. Recommended: Approach A (Strategy Pattern Extension).
Score: A=8.0, B=6.5, C=7.2
ADR: docs/architecture/004-feature-name.md
Awaiting review. @david
```

Post at: Phase 0 complete, Phase 1 complete, Phase 2 complete, Phase 3 complete, Phase 3.5 complete, pipeline complete.
Post on failure: any phase that errors or has blockers.

## Tips

- Always present checkpoints between phases — don't run the full pipeline silently
- If the Epic is a bug fix (not a feature), skip Phase 3's multi-approach and do a single focused fix
- If the Epic is small (< 3 files affected), consider simplifying to a single approach
- Use Agent tool with subagent_type for parallel research across repos
- Load stack skills before implementing in each repo
