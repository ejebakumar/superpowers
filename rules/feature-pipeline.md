# Feature Pipeline Rules

Rules governing the AI Native Feature Builder pipeline execution.

## Pipeline Execution

- **Always present checkpoints** between phases. Never run the full pipeline silently.
- **STOP AND WAIT after every phase.** Do NOT auto-advance. The user must approve, modify, or redirect before the next phase starts.
- **Accept user modifications at any checkpoint.** The user can: add/change approaches, re-run a phase, skip phases, add context, or stop the pipeline.
- **Complete ALL phase deliverables before presenting the checkpoint.** Don't show partial results — finish the docs, Jira updates, and artifacts first, then stop for input.
- **Always post to Jira** when a phase completes. The ticket is the source of truth for stakeholders.
- **Always use the Jira cloudId** `151636d7-9099-4803-a108-4f053f36c9fe` for all Atlassian MCP calls.
- **Confluence writes go to ONE space only:** space key `~712020a0b63342badc4b25ab05e1dc1cb61a3d`, space ID `5895915199`. The `createConfluencePage` API requires the numeric `spaceId`, not the space key. Reading from any space is fine. All page creates and edits MUST target this space.
- **Parallel execution via worktrees is MANDATORY for multi-approach implementation.** Since the workspace root is not a git repo, create worktrees MANUALLY in each repo subdirectory. Name worktree folders with **meaningful short names derived from the approach** (e.g., `strategy-pattern`, `middleware-hook`, `event-driven`), NOT generic labels like `approach-a`. All Agent calls MUST be sent in a single message so they run concurrently.
- **NEVER skip worktree creation.** If worktree creation fails, DO NOT fall back to sequential implementation on the same branch. Debug the failure (wrong directory, branch already exists, etc.) and fix it. The orchestrator MUST verify worktrees were created before launching implementation agents. If an agent reports it couldn't create a worktree, the phase FAILS — fix and retry.
- **Worktree creation is a PRE-STEP, not optional.** Before launching ANY implementation agent, the orchestrator MUST:
  1. Derive meaningful short names from each approach (e.g., from ADR: "Strategy Pattern Extension" → `strategy-pattern`, "LangGraph Agent" → `langgraph-agent`, "Middleware Hook" → `middleware-hook`)
  2. `mkdir -p worktrees/{strategy-pattern,langgraph-agent,middleware-hook}` at workspace root
  3. For EACH affected repo, cd into it and create worktrees:
     ```bash
     cd degreed-coach-builder
     git worktree add ../worktrees/strategy-pattern/degreed-coach-builder -b feature/{epic}-strategy-pattern main
     git worktree add ../worktrees/langgraph-agent/degreed-coach-builder -b feature/{epic}-langgraph-agent main
     git worktree add ../worktrees/middleware-hook/degreed-coach-builder -b feature/{epic}-middleware-hook main
     cd ../Degreed
     git worktree add ../worktrees/strategy-pattern/Degreed -b feature/{epic}-strategy-pattern main
     git worktree add ../worktrees/langgraph-agent/Degreed -b feature/{epic}-langgraph-agent main
     # ... repeat for fe-workspace, degreed-flutter
     ```
  4. Verify all worktrees exist: `ls worktrees/strategy-pattern/` should show repo folders
  5. ONLY THEN launch the parallel agents, pointing each at its worktree path
- **Clean up worktrees after implementation.** Once branches are pushed to remote and PRs created, remove all worktrees with `git worktree remove {path}` from each repo, then `rm -rf worktrees/`. To resume work later, recreate a worktree from the remote branch: `git worktree add ../worktrees/{approach}/{repo} {branch-name}`.
- **Spin up as many agents as needed.** There is no artificial limit. If research needs 5 parallel repo scans, launch 5 agents. If implementation needs 3 worktrees, launch 3. If review needs parallel PAL checks, launch them all at once.
- **Always use `model: "opus"` for agents.** Every Agent call should specify `model: "opus"` to use Claude Opus 4.6 with the full 1M token context window. This ensures agents can read large files, hold full repo context, and reason deeply.
- **Load stack skills** before implementing in any repo. Never implement without understanding conventions.
- **Features span ALL layers.** Expect to touch: fe-workspace + degreed-flutter (frontend), Degreed (.NET), degreed-coach-builder + degreed-assistant (Python).
- **Workspace root is NOT a git repo.** `maestro_repo_ai_native/` is a plain folder containing 5 independent git repos. All git commands MUST be run inside a repo subdirectory (`cd degreed-coach-builder && git ...`). Running git at the workspace root will fail.

## Task List — Maintain Throughout Session

- **Create tasks for ALL pipeline phases at the start** (Phase 0). Each phase = one task.
- **Update task status in real-time:** `in_progress` when starting, `completed` when done.
- **Skipped phases:** Mark as completed with "— SKIPPED" appended to the subject. Don't leave them pending.
- **Re-run phases:** Update the EXISTING task back to `in_progress` with "(re-run #N)" in the subject. Don't create a duplicate.
- **Sub-tasks for parallel work:** Phase 3 agents get their own sub-tasks under the Phase 3 parent.
- **The task list is the user's real-time view of pipeline progress.** If it's stale or incomplete, the user can't track what's happening.

## UI & Design — Ask, Don't Guess

- **MANDATORY: Load Apollo Design System skill BEFORE writing ANY Angular UI code.**
  1. Load skill: `degreed-fe-workspace:apollo-design-system`
  2. Check `libs/shared/apollo/` for existing components
  3. Use Apollo components — NEVER build raw Tailwind when Apollo exists:
     - `DrawerService` for drawers/panels (NOT raw CDK Dialog)
     - `da-button` for buttons (NOT custom Tailwind buttons)
     - `da-icon` for icons (NOT raw SVG)
     - `da-input`, `da-textarea` for form inputs
     - `ToastService` for notifications
     - `DialogService` for modals
  4. **FAILURE TO FOLLOW = UI REJECTED.** Raw Tailwind duplicates of Apollo components are not acceptable.
- **MANDATORY: Use the Known UI Patterns table BEFORE building new components.**

  **KNOWN UI PATTERNS — Use These First:**
  | Pattern | Reference Component | Key Notes |
  |---------|---------------------|-----------|
  | Chat input | `coach-conversation-input-v2` | Container handles border, textarea borderless, `arrow-up` icon |
  | Chat messages | `coach-conversation-virtualized` | Virtual scroll, role-based bubble styling |
  | Message bubble | Coach templates | Assistant: `tw-bg-neutral-100`, User: `tw-bg-primary-700` |
  | File upload chip | `coach-file-upload-chip` | Pill with file icon, close, loading |
  | Suggestion pills | `coach-prompts-v2` | `tw-rounded-full tw-border` |
  | Drawer | `DrawerService` (Apollo) | NEVER raw CDK Dialog |
  | Toast | `ToastService` (Apollo) | NEVER custom notifications |
  | Inputs | `da-input`, `da-textarea` | NEVER raw HTML inputs |

  **Rules:**
  1. Check the table FIRST — don't search blindly in a huge codebase
  2. READ the reference component — match its structure exactly
  3. IMPORT if complex — don't rebuild what exists

  **Lesson learned:** Building a chat input from scratch instead of matching `coach-conversation-input-v2` resulted in inconsistent styling.
- **If the feature involves UI changes, always ask about design assets** at intake: Figma URL? Screenshots? Reference page? Or "no design — I'll describe it"?
- **If a Figma URL exists, using the Figma MCP is MANDATORY.** Never WebFetch a Figma URL when the MCP is available — you'll lose all the structural design context. Always:
  1. Load the `figma:figma-use` skill BEFORE any `mcp__plugin_figma_figma__*` write call
  2. Load the `figma:figma-implement-design` skill BEFORE translating designs into code
  3. Call `mcp__plugin_figma_figma__get_design_context` (returns reference code + screenshot + Code Connect mappings + tokens)
  4. Call `mcp__plugin_figma_figma__get_screenshot` for visual reference
  5. Call `mcp__plugin_figma_figma__get_variable_defs` to extract design tokens
  6. Call `mcp__plugin_figma_figma__get_code_connect_map` — if mappings exist, REUSE the mapped Apollo/Fresco component instead of generating from scratch
  7. Save extracted artifacts (screenshot, tokens, component map) to `docs/builds/{EPIC-ID}-design/` and reference from build tracker
- **No Figma? Load `degreed-design-system` skill and generate a visual preview** using Apollo/Fresco UI kit components, brand colors, and typography. Create a static HTML file the user can preview.
- **Never implement UI blind.** The user must see and approve the proposed layout before any agent writes frontend code.
- **When building UI, ALWAYS load `degreed-design-system` skill first.** It has the two visual systems (Apollo for marketing/auth, Fresco for in-product), brand colors, Inter font, icon set, illustrations, and UI kit components for both web and Flutter.
- **When in doubt about any UI pattern, check the design system skill** — it has answers for spacing, color, type, density, icons, and component selection.
- **Check Apollo components** at research time — know what's available vs what needs to be custom before implementation.
- **Research ALL layers** — use the layer coverage checklist. If the research doc doesn't cover UI, .NET, Python, DB, and infrastructure, it's incomplete.

## Model & Component Reuse — Search First, Ask If Unsure

**THIS IS A BLOCKING GATE. Code that violates these rules will be REJECTED.**

- **🚨 MANDATORY PRE-FLIGHT CHECKLIST** (complete BEFORE writing ANY code):
  ```
  [ ] 1. Model search: grep -r "export interface" apps/lxp/src/app/ --include="*.ts" | grep -i {keyword}
  [ ] 2. Component search: find apps/lxp/src/app -name "*.component.ts" | xargs grep -l "{pattern}"
  [ ] 3. Pattern reference: Found and READ the reference component for this UI pattern
  [ ] 4. Apollo check: Loaded apollo-design-system skill, checked libs/shared/apollo/
  [ ] 5. Defaults check: NOT customizing/hiding framework features unless explicitly asked
  ```
  **If ANY checkbox is unchecked, STOP and complete it. Do NOT proceed to implementation.**

- **🚨 MANDATORY: Search for existing models BEFORE creating new ones.**
  Before creating ANY new interface, type, or component:
  1. **SEARCH** — Run `grep -r "export interface" apps/lxp/src/app/ --include="*.ts" | grep -i {keyword}`
  2. **READ** — If found, read the existing model/component to understand its structure
  3. **EXTEND** — Default action is to EXTEND existing, NOT create parallel duplicates
  4. **ASK** — If unsure whether to extend or create new, **STOP and ask the user**

- **The extend-first pattern:**
  ```typescript
  // WRONG — Creates duplicate model
  interface AskMaestroMessage { id, role, content, timestamp }

  // RIGHT — Extends existing, adds only what's new
  import { ChatMessage } from '@app/degreed-coach/models';
  interface AskMaestroMessage extends ChatMessage { skill?: AskMaestroSkill; }
  ```

- **When to ask clarifying questions:**
  - You found an existing model but aren't sure if it fits
  - The existing model has 80%+ field overlap with what you need
  - You're considering creating a "parallel" model for a similar domain
  - You're building a component that looks like an existing one

- **Question format when asking:**
  ```markdown
  ## Model Decision Needed
  Found existing: `ChatMessage` in `@app/degreed-coach/models`
  Fields: messageId, senderType, messageText, isUser, messageTimestamp...

  New feature needs: skill routing, entity metadata

  Options:
  1. EXTEND ChatMessage (recommended) — add skill + metadata fields
  2. CREATE separate model — if ChatMessage is too tightly coupled

  Which approach should I take?
  ```

- **Lesson learned:** Creating `AskMaestroMessage` with separate fields (`id`, `role`, `content`) instead of extending `ChatMessage` (`messageId`, `senderType`, `messageText`) caused unnecessary duplication and inconsistency.

## Framework Defaults — Don't Over-Customize

- **🚨 MANDATORY: Use framework defaults unless EXPLICITLY told otherwise.**
  - Drawer buttons (Cancel/Save) → VISIBLE by default, only hide if user says "hide buttons"
  - Component features → ENABLED by default, only disable if user says "disable X"
  - Validation → ENABLED by default, only skip if user says "skip validation"
  - Animations → ENABLED by default, only disable if user says "no animations"

- **The "it makes sense" trap:**
  ```
  WRONG thinking: "This is a chat, so it makes sense to hide Save/Cancel buttons"
  RIGHT thinking: "User didn't mention buttons, so I'll use the default (visible)"
  ```

- **When you think about customizing anything, ask yourself:**
  1. Did the user EXPLICITLY request this customization?
  2. If not, use the framework default.
  3. If unsure what the default is, READ the component source.

- **Lesson learned:** Hid drawer buttons because "chat has its own input" — user wanted standard buttons visible. Never assume; use defaults.

## Live UI Verification — Playwright MCP Is Mandatory for FE Features

- **Phase 7 (Live Testing) MUST include a Playwright UI pass** for any feature with frontend changes. API-only verification is INSUFFICIENT for FE-touching PRs — a 200-OK on `/api/coach/status` doesn't prove the page renders or the button works.
- **Phase 6 smoke test SHOULD use Playwright** when the deployment includes FE changes — `curl /health` doesn't catch white-screen-of-death, console errors, or missing assets.
- **Phase 3.5 (Code Review) and a11y-review SHOULD capture screenshots** of the deployed PR env via Playwright and run axe-core for live WCAG 2.2 AA scans.
- **Tools to use** (verify exact namespace via `ToolSearch` on first call — likely `mcp__playwright__*`):
  - `browser_navigate(url)` — open the deployed PR URL
  - `browser_snapshot()` — accessibility tree (preferred over screenshot for assertions)
  - `browser_take_screenshot()` — visual evidence; save to `docs/builds/{EPIC-ID}-evidence/`
  - `browser_click({element, ref})`, `browser_type({element, ref, text})` — interact
  - `browser_console_messages()` — capture JS errors (any error = test failure)
  - `browser_evaluate(fn)` — run axe-core for a11y violations
- **Evidence is mandatory.** Every Playwright run produces screenshots + console logs in `docs/builds/{EPIC-ID}-evidence/`. The build tracker links them. PR comments embed them.
- **Fail loud.** If Playwright detects console errors, missing components, or axe violations on a deployed PR env, the verdict is FAIL — no soft passes for visual bugs.

## Ask Clarifying Questions — Don't Guess

- **If anything is ambiguous, ask.** Present all unclear questions as a batch at the start of research.
- **Common questions to ask:** mobile scope, design status, performance targets, existing feature overlap, data shape expectations.
- **Don't stall on questions.** Ask them, then proceed with what you CAN research while waiting for answers. Circle back when answers arrive.

## External Research Is Mandatory

- **Every research phase MUST include internet research.** No exceptions. "I already know this" is not acceptable — production experience from the internet catches what training data misses.
- **Minimum:** 5+ WebSearch queries, 3+ full articles read via WebFetch, structured write-up in the research doc.
- **Three dedicated research agents** must be launched in parallel: architecture patterns, known issues/anti-patterns, library docs.
- **The Maestro-Critic will check** that external research actually happened. If the research doc's external research section is empty or superficial, the critic will flag it as a BLOCKER.

## ADR — Approaches Are Flexible, Not Fixed at 3

- **Brainstorm broadly** — list ALL approaches considered, even ones quickly ruled out. The ADR captures full thinking.
- **Default is 3 for implementation** but the user can choose: 1, 2, 3, 4, or more.
- **Every ruled-out approach gets a "why not"** in the ADR — this prevents future re-discovery of dead ends.
- Adjust worktree count and agent count dynamically to match the selected approach count.

## Rule Promotion Lifecycle

When the same `blocker_type` recurs in `agent-findings.jsonl`, promote it to a permanent rule in this file. The system learns by turning recurring Critic findings into upfront constraints — that's the L4 loop.

**Dual threshold for promotion** (either condition triggers candidacy):
- `count ≥ 2 in last 14 days` (recent recurrence — fast learning)
- OR `count ≥ 3 in last 90 days` (slow burn — long memory)

Single-threshold (e.g. `≥3 in 30d`) would never trip at low feature velocity — the dual threshold catches both fast-firing and slow-burning patterns.

**Trigger:** `dora-rollup.sh` (weekly) detects threshold breach and pings via Pushover with `Run /promote-rule {blocker_type}`. The user invokes the slash command on demand — promotion is never autonomous.

**Promotion workflow (`/promote-rule {blocker_type}`):**
1. Query: `jq -c "select(.blocker_type==\"{type}\" and .verdict==\"BLOCKED\")" .claude/agent-findings.jsonl > /tmp/promote-evidence.jsonl`. Refuse if `wc -l < 2`.
2. **Existing-rule check:** grep this file for prior rules covering `{blocker_type}`. If found, propose an **amendment PR** with new evidence rather than a duplicate rule.
3. Synthesize the rule by reading every cited file:line in the evidence. Find the common pattern; find the opposite pattern (what success looks like) elsewhere in the codebase.
4. Draft the rule in the existing style of this file. Place under the appropriate H2. Format:
   ```markdown
   - **MANDATORY: {rule statement}**
     - **Reason:** {one-liner — what breaks if this isn't followed}
     - **How to apply:** {where to check, which file/component}
     - **Evidence (last_fired: {ISO timestamp}, count: N):** {1-2 file:line examples from JSONL}
   ```
5. Open a PR against the `ai_native` repo:
   ```bash
   git checkout -b rule/promote-{blocker_type}-{YYYYMMDD}
   git commit -m "rule: promote {blocker_type} (fired {N}x in {D}d)"
   gh pr create --title "rule: promote {blocker_type}" --body "{evidence + proposed diff}"
   ```
6. Pushover ping: title `[meta] - Rule promoted {blocker_type}`, body lists evidence count, window, PR URL.
7. **Silent local PR + Pushover only.** No Jira comments, no Confluence pages — aligned with `feedback_no_jira_comments`.

**Lifecycle metadata on promoted rules:**
- Each promoted rule carries an inline `(last_fired: {ISO}, count: N)` annotation maintained by `dora-rollup.sh`.
- `last_fired` updates whenever `agent-findings.jsonl` records a new BLOCKED finding for that `blocker_type` (after promotion, this should rarely fire — if it does, the rule is wrong or insufficient).
- `count` is the cumulative occurrence count across all time.

**Quarterly prune (`prune-rules.sh`):**
- Runs every 90 days (cron or manual).
- Any promoted rule with `last_fired` older than 6 months gets demoted to a "Deprecated Rules" appendix at the bottom of this file. Removing eliminates rule sprawl.
- Demoted rules stay visible in git history; can be re-promoted if a finding fires again later.

**Greenfield exception:** promoted rules and codebase-wide claude-mem entries inject into research **regardless of intake mode**. Greenfield archival applies only to feature-specific assets (prior research/plans/trackers for the same Epic). See § Memory Injection Protocol.

## Memory Injection Protocol

The Phase 1 researcher receives auto-injected context at spawn so the system's accumulated learning feeds forward. This closes the L4 loop: findings become rules, rules become research constraints, future features inherit the learning.

**What gets injected:**
1. **Promoted rules** (last 30 days from `git log .claude/rules/feature-pipeline.md --since=30.days --grep="^rule: promote"`) — treat as **HARD CONSTRAINTS**, no verification needed (they're code-reviewed at PR time).
2. **Top 5 claude-mem hits** for the feature description — treat as **POINTERS**, must be verified before relying on. Memory recall protocol applies (see global instructions): grep the cited file/function/migration to confirm it still exists; check signatures still match; check Confluence pages for updates since the memory date.
3. **Block-rate-by-type for last 30 days** from `phase-metrics.jsonl` cross-referenced with `agent-findings.jsonl` — informational signal of which blocker types are currently most common; researcher can preemptively address them in the plan.

**How injection happens:** `maestro-researcher.md` invokes a `gather-context` skill at spawn that returns the three artifacts above as a structured block. Hook-based injection at `UserPromptSubmit` time was rejected because hooks can't reliably detect *which* agent is invoking. Skill-call from the agent's prompt is explicit and inspectable.

**Greenfield mode does NOT archive:**
- Promoted rules in `.claude/rules/feature-pipeline.md` — codebase-wide constraints, always inject
- Claude-mem entries about the codebase (architecture, patterns, conventions) — codebase-wide, always inject
- Prior `agent-findings.jsonl` and `phase-metrics.jsonl` — historical measurement, always inject

**Greenfield mode DOES archive:**
- Prior research docs for the same Epic
- Prior plans for the same Epic
- Prior build trackers for the same Epic

The distinction: promoted rules and codebase memories teach the system about the codebase; feature-specific assets capture a particular pipeline run that the user wants to redo.

**Verification requirement:** if the researcher acts on a claude-mem hit without verifying first and the citation turns out to be stale, the Phase 1 critic flags it as a hallucination (existing § Mandatory Verification rule applies). Promoted rules are exempt from verification — they were code-reviewed at PR time.

**Empty injection signal:** if both promoted rules and claude-mem return empty, the researcher notes this in the research doc ("Memory injection empty — system not yet learning, Builds 1-4 not yet complete"). This makes the L4-not-firing case observable.

## Memory — Write Findings, Verify Before Using

**Save significant discoveries to claude-mem** after every research and review phase. Future pipeline runs benefit from what past runs learned.

**What to save:** Reusable building blocks, architectural constraints, feature flag interactions, cross-service patterns, edge cases, reverted approaches.
**What NOT to save:** File paths, line numbers, version numbers — anything that becomes stale quickly.

**ALWAYS verify recalled memories before acting on them:**
- Memory says a file exists → check it still does
- Memory says a function works this way → grep and read it now
- Memory references a Confluence page → re-fetch it, check for updates since the memory date
- Memory references a DB schema → read the current SQL definition

**If a memory is stale:** note the discrepancy, update the memory, and proceed based on current reality. Never trust a memory over what you can observe right now.

## Maestro-Critic (Devil's Advocate)

- **Runs after EVERY phase**, before the user checkpoint. No exceptions unless user explicitly says "skip the critic."
- **Uses fresh context** — launched as a separate agent with NO prior pipeline reasoning bias. Gets the phase output and requirements, validates independently.
- **Evidence-based only.** Every flaw must cite: specific code (file + line), or internet source (URL), or Confluence page, or multi-model validation result. "This might not work" without evidence is not acceptable.
- **Multi-model validation mandatory.** Critic must use at least TWO of: Codex MCP (`mcp__codex__codex`), PAL challenge (`mcp__pal__challenge`), PAL analyze (`mcp__pal__analyze`), web search.
- **No over-engineering.** If the approach is pragmatically sound for v1, the critic MUST NOT demand perfection. "This could be more elegant" is a NOTE, never a BLOCKER.
- **Configurable mode:**
  - `advisory` (default) — findings presented alongside phase results, pipeline proceeds to user checkpoint
  - `gatekeeper` — blockers STOP the pipeline, user must acknowledge before proceeding
- **Critic reviews are logged** in the build tracker under "Critic Reviews" table.

## Critic Findings JSONL Contract

Critic verdicts must persist as structured state, not stdout-only. Every Critic invocation appends one or more JSON lines to `.claude/agent-findings.jsonl` (append-only). This file is the source of truth for downstream tooling (rule promotion, autofix, DORA block-rate-by-type).

**Architectural invariant:** the Critic stays read-only (`disallowedTools: [Write, Edit, Agent]` on the agent definition is non-negotiable). Findings reach the JSONL via stdout extraction:

1. The Critic emits findings in a fenced block at the end of its output:
   ```
   <agent-findings>
   [
     {"verdict":"BLOCKED","blocker_type":"apollo_missing","autofix_eligible":true,"evidence":{"file":"...","line":47,"description":"..."},"model_validations":["codex","pal_challenge"]}
   ]
   </agent-findings>
   ```
2. A `SubagentStop` hook (`.claude/hooks/subagentstop-extract-findings.sh`) parses the block from the agent's transcript, decorates each entry with `ts`, `feature_id` (from `CLAUDE_FEATURE_ID` or git branch), `phase` (from tracker active phase), `agent_run_id`, `tracker_ref`, and appends one JSON line per finding to `.claude/agent-findings.jsonl`.

**Generalization:** the same hook accepts `<agent-findings>` blocks from any agent (reviewer, researcher, implementer) — not just Critic. The JSONL is per-agent-type filterable via the `agent` field.

**Schema (one line per finding):**
```json
{
  "ts": "2026-05-09T10:23:00Z",
  "feature_id": "AIDATASCI-4785",
  "phase": "3.5",
  "agent": "maestro-critic",
  "agent_run_id": "crit-20260509-102300",
  "verdict": "BLOCKED",
  "blocker_type": "apollo_missing",
  "autofix_eligible": true,
  "evidence": {
    "file": "fe-workspace/apps/lxp/src/app/team-context/team-context.component.ts",
    "line": 47,
    "description": "Custom Tailwind table built; libs/apollo/data-table exists"
  },
  "model_validations": ["codex", "pal_challenge"],
  "tracker_ref": "docs/builds/AIDATASCI-4785-team-context.md",
  "resolved_by_pr": null
}
```

Fields:
- `verdict` — `APPROVED` | `APPROVED_WITH_WARNINGS` | `BLOCKED`
- `blocker_type` — short snake_case category (`apollo_missing`, `model_extend_violation`, `i18n_missing`, `framework_default_hidden`, etc.). Re-use existing types where possible — new types should only be coined when no existing type fits.
- `autofix_eligible` — `true` only if the fix is mechanical and within the autofix allowlist (see § Autofix Carve-out)
- `resolved_by_pr` — initially `null`. Set to PR URL by autofix daemon (or by hand) once a fix lands. Critic uses this to skip re-blocking the same finding.

**Mandatory:** every Critic invocation emits the block, even when `verdict: APPROVED` (so the `agent-findings.jsonl` records phase coverage, not just failures).

## Phase Metrics JSONL Contract

Every phase exit writes one structured line to `.claude/phase-metrics.jsonl`. This is the measurement source of truth (DORA, lead time, change failure rate). The build tracker also gets a human-readable summary line — same data, two consumers.

**Written by:** `phase-verify.sh` on exit code 0 (phase complete). If `phase-verify.sh` returns non-zero (blockers present), no metrics line is written until the phase actually completes.

**Schema:**
```json
{
  "feature_id": "AIDATASCI-4785",
  "phase": "3",
  "started": "2026-05-09T09:00:00Z",
  "ended": "2026-05-09T09:23:00Z",
  "duration_min": 23,
  "critic_verdict": "APPROVED",
  "author_tag": "agent",
  "tracker_ref": "docs/builds/AIDATASCI-4785-team-context.md"
}
```

Fields:
- `phase` — phase number as string (`"0"`, `"1"`, `"2"`, `"3"`, `"3.5"`, `"4"`, `"5"`, `"6"`, `"7"`, `"8"`, `"9"`)
- `author_tag` — `agent` (Claude end-to-end), `partial` (human dictated structure or edited mid-flow), `human` (no agent involvement). Test sessions in default/directed mode are `agent`; specified mode is `partial`. See `feature-test-gen/SKILL.md` § Scenario Composition.
- `critic_verdict` — copied from the matching `agent-findings.jsonl` entry; if the phase had no Critic run, set `null`.
- **Tokens deferred this wave.** Add `tokens_input`, `tokens_output` fields when the Anthropic SDK billing API is wired through hooks. Capturing only `duration_min + critic_verdict + author_tag` is sufficient to compute lead time, change failure rate, and Critic block rate today.

**Tracker line (parallel — human-readable):**
```
*Metrics:* `phase=3 | started=2026-05-09T09:00:00Z | ended=2026-05-09T09:23:00Z | duration_min=23 | critic=APPROVED | author=agent`
```

The tracker line is for humans skimming the build doc; the JSONL is for `dora-rollup.sh`. Don't grep the tracker for metrics — read the JSONL.

**Source-of-truth reconciliation:**
- **Tracker** = narrative truth (decisions, links, status, prose). Human consumers.
- **JSONL files** = measurement truth (timestamps, counts, evidence). Machine consumers.
- Each JSONL line carries `tracker_ref` pointing back at its tracker; each tracker references its JSONL paths in a "Metrics" section. They are not redundant; they serve different consumers.

## Agent Architecture

Agents are defined in `.claude/agents/*.md` with declarative frontmatter (model, tools, isolation, memory). The conductor spawns specialists — don't re-derive agent behavior from prose.

| Agent File | Role | Model | Key Constraint |
|-----------|------|-------|---------------|
| `maestro-conductor.md` | Pipeline orchestrator | Sonnet | Spawns others, never implements code |
| `maestro-triage.md` | Routes input to right workflow | Sonnet | Never does work, only routes |
| `maestro-researcher.md` | Phase 1 deep research | Opus | Mandatory external research |
| `maestro-critic.md` | Devil's Advocate (every phase) | Sonnet | Read-only, can't Write/Edit |
| `maestro-implementer.md` | Implementation (×N, parallel) | Opus | `isolation: worktree`, auto-cleaned |
| `maestro-reviewer.md` | Code review | Sonnet | Read-only, can't Write/Edit |
| `maestro-doc.md` | Confluence + SDD | Sonnet | Full content, not stubs |

## Agent Identity System

Every agent signs Jira comments with its identity. The identity is assigned by the conductor when spawning:

| Identity | Used By | When |
|----------|---------|------|
| `[Agent Maestro-Conductor]` | maestro-conductor | Pipeline status, planning comments |
| `[Agent Maestro-Researcher]` | maestro-researcher | Research findings |
| `[Maestro-Critic]` | maestro-critic | Phase reviews |
| `[Agent Maestro-{approach-name}]` | maestro-implementer | Implementation (e.g., `[Agent Maestro-strategy-pattern]`) |
| `[Agent Maestro-Review]` | maestro-reviewer | Code review findings |
| `[Agent Maestro-Doc]` | maestro-doc | Documentation updates |

All Jira comments from agents MUST:
1. Start with the agent identity prefix: `[Agent Maestro-Alpha] ...`
2. State what phase/action is being performed
3. End with relevant details (PR links, findings, etc.)

## Branch Naming

All feature builder branches use **meaningful names derived from the approach**, NOT generic letters:
```
feature/{epic-id}-{approach-short-name}

# Examples:
feature/PD-1234-strategy-pattern
feature/PD-1234-langgraph-agent
feature/PD-1234-middleware-hook
feature/PD-1234-event-driven-redis
```

Bug fix branches:
```
fix/{ticket-id}-{short-name}
```

Create branches in ALL affected repos with the SAME name. The short name should be 2-4 words, kebab-case, describing the core idea of the approach.

## Branch Creation — Always Start from Latest

**Before creating ANY feature branch, ALWAYS pull the latest from the base branch first.** Stale branches cause merge conflicts and CI failures.

```bash
# Default: branch from latest main
cd {repo}
git checkout main
git pull origin main
git checkout -b feature/{epic-id}-approach-{x}-{name}

# If user specifies a base branch:
cd {repo}
git checkout {base-branch}
git pull origin {base-branch}
git checkout -b feature/{epic-id}-approach-{x}-{name}
```

**Rules:**
- Default base branch is `main` unless the user says otherwise
- If the user says "branch from `release/2025.2.1`" or "use `develop` as base", use that branch
- ALWAYS `git pull` before creating the feature branch — never branch from a stale local copy
- Do this in EVERY repo that gets a feature branch
- Each worktree agent MUST do this independently in its isolated copy

## API Contract & Implementation Order

Each approach agent owns the FULL vertical slice (Python + .NET + Angular + Flutter). There is no cross-agent API contract problem because one agent builds both producer and consumer.

**Mandatory implementation order (bottom-up):**
1. **Define the contract** — request/response shapes, route, headers (internal blueprint)
2. **Python** (degreed-coach-builder) — Build the endpoint (source of truth)
3. **.NET** (Degreed) — Build the proxy: route constant → orchestrator → controller → DTOs
4. **Frontend** (fe-workspace + degreed-flutter) — Build UI: models → services → state → components
5. **Python callbacks** (if needed) — EndpointRegistry + DegreedApiService for .NET callbacks

Never build the .NET proxy before the Python endpoint exists. Never build the frontend before the .NET endpoint exists. Each layer's contract is fixed before the next layer starts.

## PR Standards

- Title format: `feat: {description} ({approach-short-name} for {EPIC-ID})`
- Body must include: Jira link, ADR link, approach description, test plan
- Cross-reference all 3 approach PRs in each PR body
- Use Draft PRs for lightweight/sketch approaches
- Multi-repo features need PRs in each repo, cross-linked

## Confluence Wiki Folder — Full Content, Not Stubs

Every pipeline run creates a **Confluence folder** (parent page + child pages) so docs are accessible in the cloud:
- **Parent page:** `{EPIC-ID} — {Feature Name}` under space ID `5895915199`
- **Child pages contain the FULL document content** — NOT summaries, NOT "see local file at docs/plans/...". The Confluence page IS the document.
- **After each phase:** write the COMPLETE document content to the Confluence child page via `updateConfluencePage` with `contentFormat: "markdown"`. The local file in `docs/` is a git backup.
- **Link everywhere:** Jira comments and PR descriptions link to Confluence pages (NOT local file paths).
- Store all Confluence page IDs in the build tracker for reference.

**Why this matters:** Other team members access docs through Confluence, not your local filesystem. If the Confluence page says "see docs/plans/004-research.md", nobody can read it. Every Confluence page must be self-contained and complete.

## Jira Ticket Strategy — Requirement-Based, Not Phase-Based

**DO NOT create a Jira ticket for every pipeline phase.** Pipeline phases (research, ADR, review, docs) are tracked in the build tracker document. Jira tickets are for ACTUAL DELIVERABLE WORK.

**Always ask the user before creating tickets.** Present proposed tickets and offer options:
- "create all" → Create all proposed Tasks
- "create [specific ones]" → Selective creation
- "track locally" → No tickets, use build tracker only
- "add a spike for [topic]" → Create exploratory ticket

**Ticket types:**
| Type | When | Example |
|------|------|---------|
| Task | Concrete implementation work | "Add CanReferenceTeamData to DB schema" |
| Story | User-facing requirement | "Manager sees team skill gaps in coach" |
| Spike | Exploratory investigation | "Investigate prompt-inject vs tool-call tradeoff" |
| Bug | Found during testing | "SSE disconnect on large team context" |

**DO NOT create:** `[AI] Deep Research`, `[AI] Architecture Decision`, `[AI] Documentation`, `[AI] Code Review`, `[AI] Test Skill` tickets. These are pipeline overhead — the docs themselves are the deliverables.

**Tickets can be created at ANY point** — not locked to Phase 0. User can say "create a bug for this" at any checkpoint.

**Hierarchy:** `Epic (level 1) → Task/Story (level 0) → Subtask (level -1)`. When parent is Epic, create Task type.

**Required fields vary by project.** Always look up via `getJiraIssueTypeMetaWithFields` before creating:

| Project | Type | Required Field | Key |
|---------|------|---------------|-----|
| AIDATASCI | Task | Acceptance Criteria | `customfield_11938` |

## Dependency Validation Rules

**CRITICAL: When modifying EXISTING modules, always validate cross-project impact.**

- **New code** (no existing consumers) → No dependency check needed
- **Existing code, same project** → Verify intra-project consumers
- **Existing code, cross-project** → **FULL dependency trace required**
- **API contract changes** → **All consumers MUST be verified** (Python ↔ .NET ↔ Angular ↔ Flutter)
- **Database schema changes** → **All layers MUST be checked**
- **Redis/session changes** → **Both Python and .NET MUST be checked**

## Code Review Rules (Phase 3.5)

After implementation, before documentation, verify:

| Repo | Version | Key Standards |
|------|---------|--------------|
| Degreed (.NET) | .NET 8 / C# 11 | Async all the way, SOLID, Controller→Orchestrator→Service |
| fe-workspace | Angular 20 | Signals, NgxHttpClient, standalone components, **Apollo design system** |
| degreed-coach-builder | Python 3.12 | FastAPI async, Strategy pattern, type annotations |
| degreed-flutter | Flutter 3.35 | DegreedCubit+safeEmit, Freezed, GetIt DI |

### Apollo Component Check
- If fe-workspace needs a UI component, check `libs/apollo/` and `apps/lxp-docs/src/app/docs/apollo/`
- If no Apollo component exists → **Post a Jira comment** flagging the gap
- Do NOT block on this — document it and continue

## Build Tracker (Living Document)

Every pipeline run produces a build tracker at `docs/builds/{EPIC-ID}-{feature-name}.md`. This is:
- **Created** at Phase 0 from `docs/builds/_TEMPLATE.md`
- **Updated** after EVERY phase — before presenting the checkpoint to the user
- **The single source of truth** for pipeline state, artifacts, decisions, and user feedback
- **Resumable** — if a new session starts, read the tracker to pick up where it left off

The tracker records: pipeline progress table, all Jira sub-task IDs, all artifact links (research doc, ADR, PRs, Confluence), API contracts, user feedback at each checkpoint, and a chronological decision log.

## Document Naming

Follow the `docs/` convention with 3-digit IDs:
- Build tracker: `docs/builds/{EPIC-ID}-{feature-name}.md` (named by Epic, not numbered)
- Research: `docs/plans/{id}-{feature}-research.md`
- ADR: `docs/architecture/{id}-{feature}.md`

## Adaptive Behavior

- **One-liner input (no ticket):** User describes a feature or bug in plain text. Skip Jira fetch, extract requirements from the description, ask clarifying questions, offer to create a ticket later. The pipeline works the same — just without a Jira source.
- **Non-Epic tickets (Story/Task/Bug):** Fetch the ticket, adapt the pipeline. Stories/Tasks likely need fewer approaches. Bugs go to investigation + single fix.
- **Confluence page as input:** Fetch the page, extract requirements from its content.
- **Bug tickets:** Skip multi-approach (Phase 3 becomes single focused fix). Use `dg-jira-investigate` for root cause analysis.
- **Small features (< 3 files):** Consider single approach instead of 3.
- **User interrupts:** Save progress, allow resuming from any phase.
- **Missing permissions:** Report what's needed, proceed with what's available.

## PR Deployment Rules

**Deploy order (when all 3 repos have changes):**
1. **Python FIRST** — edit `prcheck.yml` (HOSTURL, DD_ENV, deploy:true), push, wait for Actions
2. **.NET SECOND** — hardcode Python URL in orchestrators, then `/deploy environment=Local`
3. **Frontend LAST** — `/deploy environment=Local be-ref={dotnet-branch}`

**Deploy commands:**
- **.NET:** `gh pr comment {N} --repo degreed/Degreed --body "/deploy environment=Local"`
- **Frontend:** `gh pr comment {N} --repo degreed/fe-workspace --body "/deploy environment=Local be-ref={dotnet-branch}"`
- **Python:** Edit `.github/workflows/prcheck.yml` on the PR branch:
  - `HOSTURL: pr-{N}.dgcoachbuilder-api.degreed.dev`
  - `DD_ENV: pr-{N}-localstaging`
  - `deploy: true`
  - Resulting URL: `https://pr-{N}.dgcoachbuilder-api.degreed.dev/`
- **Flutter:** No deploy — API-only testing

**Default environment:** `Local` (Dev database, local FE files)
**Poll for status:** Check PR comments every 60s. Auto-retry failed builds up to 2 times.
**Frontend URL is the test URL** — it includes both FE + BE via the `be-ref` linkage.

## Datadog Services

| Service | Datadog Name |
|---------|-------------|
| .NET Backend | `service:degreed.web.next` |
| Python FastAPI | `service:degreed-coach-builder` |
| Python Voice | `service:degreed-coach-realtime` |
| Dashboards | `https://app.datadoghq.com/dashboard/lists` |

## Plan Discipline — Anti-Drift Contract

The pipeline produces a **Detailed Implementation Plan** per selected approach (Phase 2 deliverable, file at `docs/plans/{EPIC-ID}-{approach}-plan.md`). The plan is the **source of truth** for what gets built. The implementer follows the plan; deviations require amending the plan FIRST.

### The Three Rules

**1. Plan is the source of truth**
- Implementer reads the full plan at spawn (Phase 3 start, isolated worktree)
- Implementer re-reads the **Summary**, **Current State**, and **next-step section** every check-in (every 3-5 file changes OR at every layer handoff Python→.NET→Angular→Flutter)
- Critic uses the plan as the adherence baseline at Phase 3.5

**2. Deviations update the plan first**
- When the user says "actually do X instead of Y" → implementer's first action is `/update-plan <change>` → THEN code
- When implementer hits a blocker that requires deviating → `/update-plan` to record workaround → THEN code
- Plan amendments are **separate commits** (`plan: ...`) so amendment history is preserved
- Direct code-without-plan-update is FORBIDDEN

**3. Critic enforces plan adherence as a gate**
- At Phase 3.5, critic does a plan-vs-code diff
- Any file change not in the plan → flagged
- Any plan step not implemented → flagged
- Any API shape or signature divergence → flagged
- **Default verdict for undocumented drift: BLOCKED** (gatekeeper mode for plan adherence regardless of `CRITIC_MODE`)

### What Counts As "Must Be in the Plan"

**Pragmatic threshold — these MUST be in the plan:**
- Any new file (created from scratch)
- Any new public API / endpoint / route
- Any cross-layer change (Python ↔ .NET ↔ Frontend ↔ DB)
- Any change to request/response/DTO shapes
- Any new package / dependency added
- Any new feature flag

**These do NOT require plan amendment** (just do them):
- Variable renames within a function
- Comment additions / typo fixes
- Test refactors that don't change what's tested
- One-line tweaks within an existing function the plan already names
- Bug fixes within a step the plan already covers

### Re-Read Cadence (How the Implementer Stays Fresh)

| Trigger | Re-read what | Cost |
|---|---|---|
| Spawn (Phase 3 start) | Full plan file once | ~10K tokens |
| Every 3-5 file changes | Summary + Current State + relevant next-step section | ~1K tokens |
| Layer handoff (Python→.NET, etc.) | Plan section for the new layer | ~2K tokens |
| User redirect | After amending: re-read amended section + Summary | ~1K tokens |
| Critic at Phase 3.5 | Full plan vs full diff | ~10-15K tokens |

Total cost across a 50-file feature: ~25K tokens of plan-grounding. Acceptable within Opus 4.6's 1M context.

### Plan File Lifecycle

```
Phase 1 (Research) ──▶  Existing Pattern Inventory (input)
Phase 2 (ADR)      ──▶  Plan files created from _PLAN_TEMPLATE.md, committed
Phase 3 (Impl)     ──▶  Plan re-read at every check-in; amendments via /update-plan
Phase 3.5 (Critic) ──▶  Plan-vs-code diff; BLOCKED if undocumented drift
Phase 4 (Docs)     ──▶  Final plan state included in SDD as "Implementation Plan" appendix
```

### Slash Commands

- `/update-plan <change>` — sanctioned way to amend the plan when user redirects or implementer hits a blocker. Edits the plan file, updates Amendments Log, commits as a `plan: ...` commit, then re-reads.

### What This Solves

- Plan rot (initial plan ≠ final code) — plan amendments tracked, drift caught
- Lost user redirects (mid-session redirect → no record after restart) — amendment commits preserve history
- Implementer wandering off-pattern — re-read cadence keeps plan fresh in context
- Critic missing drift — explicit plan-adherence check at Phase 3.5

### Applies To

- ✅ Feature work (Epics → multi-approach pipeline)
- ✅ Bug fixes (single-approach mode still gets a plan; the plan documents the fix steps + test cases)
- ✅ Refactors (the plan describes the before/after pattern + migration steps)
- ❌ Trivial commits (typo fix, README edit) — no plan needed; common sense applies

## Autofix Carve-out (Critic-driven, Plan-Aware)

The autofix daemon exists to land mechanical fixes for recurring Critic findings. It is the only sanctioned way for code changes to skip the standard Phase 3 implementer flow — and even then, it's NOT a Plan Discipline bypass. Autofix updates the plan FIRST, then writes code. The plan amendment becomes written evidence in `git log docs/plans/`.

### Authorization

- **Opt-in per finding only.** Autofix never spawns from raw Critic BLOCKED verdicts. The user must explicitly authorize (chat: "autofix this", or reply to the Pushover ping). The Critic flags `autofix_eligible: true` on findings the daemon CAN handle; the user decides whether it SHOULD.
- **Allowlist gate.** Only `blocker_type` values listed in `.claude/autofix-allowlist.json` are eligible. Start small (4 mechanical types max). Expand only after observing 10+ successful auto-PRs in each existing type.
- **Excluded from allowlist forever:** auth, billing, PII, security-policy, infrastructure changes. These never autofix — they fall through to human.

### Plan adherence (the carve-out, not a bypass)

Before any code edit, the fix-agent invokes `/update-plan` to record the autofix in the active plan:
1. Read the active plan at `docs/plans/{EPIC-ID}-{approach}-plan.md`
2. Run `/update-plan autofix {blocker_type}: replacing {evidence.description} with {fix description}` — this acquires the plan-amend lock, edits the relevant Step section, appends the Amendments Log, and commits as a separate `plan: ...` commit
3. Only THEN make the code change in a follow-up commit

This means autofix produces **two commits**: `plan: amend Step N for {blocker_type} autofix` followed by `fix({blocker_type}): {feature} — autofix from Critic finding {run_id}`. The plan amendment is the written evidence. The Critic at Phase 3.5 sees both and verdicts APPROVED because plan-vs-code aligns.

### Critic awareness (no infinite loop)

`agent-findings.jsonl` schema includes `resolved_by_pr` (initially `null`). When autofix opens a PR, the daemon updates the matching finding's `resolved_by_pr` to the PR URL via a single-line append to `.claude/agent-findings-resolutions.jsonl` (append-only patches; readers reconcile by `agent_run_id`). Subsequent Critic runs filter findings where `resolved_by_pr != null` from the "still BLOCKED" set. Same finding doesn't re-block.

### Worktree pattern

If the failing branch is already checked out in an existing worktree, the fix-agent uses **that worktree** (no new worktree creation). If not, the fix-agent creates a dedicated `_autofix` worktree off the failing branch:
```bash
git -C {repo} worktree add ../worktrees/_autofix/{run_id}/{repo} -b fix/{feature}-{type}-{run_id} {failing-branch}
# fix-agent works inside the worktree, push, open PR, then:
git -C {repo} worktree remove ../worktrees/_autofix/{run_id}/{repo}
```

The fix-agent never touches `main` directly. PRs are opened back to the failing branch — never to `main` — so the human-review boundary on the parent feature PR is preserved.

### Hard guardrails (non-negotiable)

| Risk | Mitigation |
|---|---|
| Cost runaway | `CLAUDE_FIX_BUDGET_USD=2` env, `timeout 600` (10 min hard kill — plenty for a 1-commit fix) |
| Trust ramp | First 5 autofix PRs per `blocker_type` require explicit user "ack" via Pushover reply before subsequent ones in same feature spawn. Track in `.claude/autofix-trust.json: {type: ack_count}`. After 5 acks, run unsupervised for that type. |
| Stuck retries | `MAX_RETRIES=3` per `blocker_type`. After cap, escalate via Pushover-high; daemon stops trying that type until user resets. |
| Concurrency | `MAX_CONCURRENT=3` fix-agents at any time. Excess findings queue. |
| Idempotency | Branch-existence check before spawn. Same `agent_run_id` never double-fixes. |
| Observability | All autofix PRs labeled `autofix:{blocker_type}`. `gh pr list --label autofix:apollo_missing` filters. |
| Auto-merge | NEVER. Autofix opens PRs only. Human reviews and merges. The L4 boundary. |

### Configuration files

- `.claude/autofix-allowlist.json` — array of eligible `blocker_type` values
- `.claude/autofix-trust.json` — `{blocker_type: ack_count}` trust counter
- `.claude/agent-findings-resolutions.jsonl` — append-only resolutions log (reconciled by `agent_run_id`)

## Phone Notifications During Pipeline Phases

The pipeline fires phone notifications at every meaningful checkpoint via `.claude/scripts/notify.sh` (**Pushover** is the default; ntfy is fallback only). The goal is to keep the developer informed of every milestone, with **complete detail** — not shallow one-liners — so the user can decide what to do without checking the terminal.

### Title Format — MANDATORY

**Format:** `[FEATURE-ID] - <topic>` for every Pushover title. The body holds the detail.

- **Feature ID** is auto-prefixed by `notify.sh` from `CLAUDE_FEATURE_ID`, git branch (`feature/{EPIC-ID}-...` / `fix/{ID}-...`), or manual `[TAG]` prefix
- **Separator** is a literal ` - ` (space-dash-space) inserted by `notify.sh` between the prefix and the title the caller passes
- **Topic** is what the caller passes — keep it short (3-6 words). The detail goes in the body, not the title

**Examples:**
- `[AIDATASCI-4785] - Deploy complete` · body: `pr-42.degreed.dev ready · .NET PR #18, FE PR #22 · approach: langgraph-runtime`
- `[AIDATASCI-4785] - Critic BLOCKED Phase 3` · body: `2 blockers, 1 autofix-eligible. Reply 'autofix this' to spawn fix-agent for apollo_missing in team-context.component.ts:47`
- `[AIDATASCI-4785] - Phase 4 done` · body: `SDD published: https://...degreed.atlassian.net/wiki/... · Next: Phase 5 test harness gen`
- `[meta] - Rule promoted apollo_missing` · body: `Fired 4x in 18d. PR #31 opened against ai_native. Review and merge to make permanent`

**Anti-patterns (don't do these):**
- `[AIDATASCI-4785] Phase 3 done · Implementation` → has `·` and missing dash separator. Use `[AIDATASCI-4785] - Phase 3 done` with detail in body.
- `[AIDATASCI-4785] - Phase 3 done - Implementation` → double dashes. Pick one topic word.
- `[AIDATASCI-4785] - All approaches done, plans aligned, ready for critic` → topic too long. Use `Phase 3 done` and put the rest in body.

### Per-Feature Tagging — MANDATORY

When the user runs multiple features in parallel, every notification must declare which feature it's for. The `notify.sh` script auto-prefixes the title with `[{FEATURE-ID}] - ` — resolved from:
1. `CLAUDE_FEATURE_ID` env var (the conductor sets this at pipeline start: `export CLAUDE_FEATURE_ID=AIDATASCI-4785`)
2. Current git branch matching `feature/{EPIC-ID}-...` or `fix/{ID}-...` (auto-extracted)
3. Manual `[TAG]` prefix in the title (caller did it themselves — auto-prefix skipped)

**Conductor responsibility:** at Phase 0, export `CLAUDE_FEATURE_ID` so every notification in the pipeline is tagged automatically:
```bash
export CLAUDE_FEATURE_ID="{EPIC-ID}"  # e.g. AIDATASCI-4785
```

### Notification Body Quality — Complete Info, Not Shallow

Every notification body MUST include:
- **What just happened** (1 sentence)
- **Concrete numbers / IDs** when available (file count, test count, PR number, env URL)
- **What's next** (next phase, blocker, or "awaiting your review")

For **failures**, ALWAYS include:
- The actual error message (first 200 chars)
- File:line if the failure is code-related
- The Actions / Datadog link to investigate
- Suggested next action ("retry", "investigate", "amend plan")

The Pushover body limit is 1024 chars — use it. A useful notification beats a terse one.

### Mandatory Call Points (Detailed Matrix)

#### Phase 0 — Intake done
```bash
.claude/scripts/notify.sh "Phase 0 done - Intake" \
  "Requirements extracted: {N}. Affected layers: {layer-list}. Linked Confluence pages: {M}. Awaiting your review of intake summary before Phase 1." \
  default clipboard "{confluence-build-tracker-url}"
```

#### Phase 1 — Research done
```bash
.claude/scripts/notify.sh "Phase 1 done - Research" \
  "Cross-repo scan: {N} files affected across {M} layers. Existing patterns cited: {N} similar features. Top 3 risks: 1){risk-1} 2){risk-2} 3){risk-3}. External research: {N} articles. Confluence: {url}. Awaiting your review before ADR." \
  default mag "{confluence-research-page-url}"
```

#### Phase 2 — ADR + Plan done
```bash
.claude/scripts/notify.sh "Phase 2 done - ADR + Plans" \
  "Approaches: {total brainstormed}, Selected for impl: {N}. Top: {approach-A} ({score}/10). Detailed plans created: {N} files at docs/plans/. Awaiting your approval to start implementation." \
  default scroll "{confluence-adr-url}"
```

#### Phase 3 — Implementation: per-approach completion (parallel agents)
Fire a notification when EACH implementer agent finishes (not just the whole phase). This gives the user real-time view of parallel runs:
```bash
.claude/scripts/notify.sh "Phase 3 - {approach-name} done" \
  "Approach {name}: {N} files changed across {M} repos. Tests: {pass}/{total}. PRs: #{p1} #{p2} #{p3}. Plan adherence: {OK/drift detected}. {N-1} other approaches still running." \
  default rocket "{primary-PR-url}"
```

#### Phase 3 — All implementers done
```bash
.claude/scripts/notify.sh "Phase 3 done - All approaches" \
  "All {N} implementer agents finished. PRs: {list with cross-links}. Combined test results: {pass}/{total}. Awaiting Phase 3.5 review." \
  default tada "{confluence-build-tracker-url}"
```

#### Phase 3.5 — Critic verdict
**APPROVED:**
```bash
.claude/scripts/notify.sh "Phase 3.5 - APPROVED" \
  "All {N} approaches passed plan adherence + standards + Apollo + a11y + security. Apollo gaps: {N}. Awaiting documentation phase." \
  default white_check_mark "{confluence-review-page-url}"
```

**APPROVED WITH WARNINGS:**
```bash
.claude/scripts/notify.sh "Phase 3.5 - WARNINGS" \
  "Approved but {N} warnings: 1){warning-1} 2){warning-2}. See review report. Awaiting your decision: proceed to docs or address warnings first." \
  default warning "{confluence-review-page-url}"
```

**BLOCKED (drift / pattern divergence / undocumented changes):**
```bash
.claude/scripts/notify.sh "Phase 3.5 - BLOCKED" \
  "Plan adherence violated. Top 3 drift points: 1){file:line — what} 2){file:line — what} 3){file:line — what}. To unblock: (a) /update-plan to ratify, or (b) revert offending code. Pipeline halted." \
  high warning "{confluence-review-page-url}"
```

#### Plan amendment via /update-plan
```bash
.claude/scripts/notify.sh "Plan amended - Step {N}" \
  "Plan changed: {what-changed}. Reason: {why}. Commit: {sha}. Resuming implementation against amended plan." \
  default memo "{plan-file-confluence-url}"
```

#### Phase 4 — Documentation done
```bash
.claude/scripts/notify.sh "Phase 4 done - SDD published" \
  "Solution Design Doc on Confluence: {N} sections, {M} diagrams. Linked: research, ADR, plans, evidence. Page: {url}." \
  default book "{confluence-sdd-url}"
```

#### Phase 5 — Test skill generated
```bash
.claude/scripts/notify.sh "Phase 5 done - Test skill" \
  "Generated test skill at .claude/skills/test-{feature}/. CLI tool: tools/{feature}/{feature}_chat.py. Self-test: {N} smoke commands all green." \
  default test_tube ""
```

#### Phase 6 — Deploy
**Deploy started:**
```bash
.claude/scripts/notify.sh "Deploy started - {layers}" \
  "Deploying {Cases-list} layers. Order: {Python → .NET → FE} or per case logic. Polling every 60s; expect {5-15} min." \
  low rocket "{actions-url}"
```

**Deploy succeeded:**
```bash
.claude/scripts/notify.sh "Deploy complete" \
  "{layers-list} live. Test URL: {pr-env-url}. Smoke test: {curl-results}. Build tracker updated. Ready for Phase 7 testing." \
  default rocket "{pr-env-url}"
```

**Deploy FAILED (after retries):**
```bash
.claude/scripts/notify.sh "Deploy FAILED" \
  "Failed at: {which-layer-step}. Error: '{first-200-chars-of-error}'. After {N} retries. Actions run: {url}. Suggested: {investigate/retry/rollback}. Pipeline halted." \
  high warning "{actions-url}"
```

#### Phase 7 — Live tests
**Tests pass:**
```bash
.claude/scripts/notify.sh "Tests - {pass}/{total} green" \
  "All scenarios pass on {pr-env-url}. Performance: {p95}ms. Datadog clean: {N} traces, 0 errors. Evidence: docs/builds/{epic}-evidence/." \
  default white_check_mark "{pr-env-url}"
```

**Tests fail:**
```bash
.claude/scripts/notify.sh "Tests FAILED - {fail}/{total}" \
  "Failed scenarios: {comma-list}. First failure: '{error-excerpt}' at {file:line or test-name}. Datadog: {N} errors, {trace-url}. Evidence saved. Suggested: {fix-and-retest/investigate/amend-plan}." \
  high warning "{datadog-trace-url}"
```

#### Phase 8 — Datadog monitoring
**Healthy:**
```bash
.claude/scripts/notify.sh "Datadog - healthy" \
  "Services {service-list}: 0 errors over {time-window}. Latency p95: {N}ms (baseline {M}ms, delta {±}). RUM: clean. Ready for approach selection." \
  low chart_with_upwards_trend "{datadog-dashboard-url}"
```

**Issues found:**
```bash
.claude/scripts/notify.sh "Datadog - ISSUES" \
  "Detected: {N} errors in {service}. Top error: '{error-excerpt}'. Trace: {url}. p95 latency: {N}ms vs baseline {M}ms ({±}%). Suggested: {fix-or-investigate}." \
  high warning "{datadog-dashboard-url}"
```

#### Step 9 — Approach selected + cleanup
```bash
.claude/scripts/notify.sh "Approach selected - {approach-name}" \
  "{N-1} other PRs closed, branches deleted. Build tracker finalized. Memory saved to claude-mem. Pipeline complete for {EPIC-ID}." \
  default tada "{merged-PR-url}"
```

### When NOT to Notify

- File-by-file edits within a single phase (use the Stop hook for end-of-session catch-all)
- Every Jira comment (none of those happen anyway per user preference — track local + Confluence only)
- Polls during deploy waits (only fire start + result)
- Trivial commits (typo fixes, comment edits)
- Plan check-ins by the implementer (those are internal — only fire on plan amendments via `/update-plan`)

### Hook-Based Auto-Notifications (already wired)

- `Stop` hook fires Claude's last message at every session end (safety net)
- `Notification` hook fires high-priority when Claude waits for permission/input

These complement the explicit pipeline notifications above — explicit calls are for proactive milestones; hooks are the catch-all.

### User-Triggered

`/notify <message>` lets the user fire ad-hoc pings; Claude infers title and priority from context. Auto-tagging with feature ID applies to these too.

## Domain Model Truths (Must Respect)

- Roleplay is a Coach subtype — use Coach-family entities and APIs
- Form is Quiz-backed — translate "form" to Quiz-backed entities
- `degreed-coach-builder` is the primary Maestro AI backend
- `degreed-assistant` is only for DGA quick-action paths
- Three-layer guardrails: System > Platform > User

---

## User Directive Conflict Gate

When a critic finding contradicts a verbatim user directive, the conductor MUST surface the conflict as a **blocking checkpoint** — never auto-resolve it by silently deriving a new requirement.

**Required format when surfacing the conflict:**

> "You said: '{verbatim quote}'. Codebase shows: {evidence — file:line, schema, or commit}. Confirm: (a) override codebase and proceed with directive, or (b) accept codebase finding and amend directive."

Rules:
- Do NOT auto-derive a new requirement (R-N) that resolves the conflict silently.
- Do NOT proceed past the checkpoint until the user picks (a) or (b).
- Log the conflict + resolution in the build tracker's Decision Log.
- Applies at every phase, but especially at Phase 0 (intake), Phase 1 (research), and Phase 3.5 (critic).

---

## Greenfield vs Continuation Intake Modes

Phase 0 has TWO modes. The conductor MUST declare the chosen mode in tracker §0 and confirm with the user before proceeding.

### Greenfield mode
Triggered by user phrases like "start fresh", "from scratch", "ignore past work", "rebuild this".

Conductor MUST, BEFORE Phase 1 begins:
1. Identify all matching prior assets (skills, tools, plans, research docs, build trackers).
2. Move them to dated archive directories:
   - `.claude/skills/_archive/{YYYY-MM-DD}/`
   - `tools/_archive/{YYYY-MM-DD}/`
   - `docs/_archive/{YYYY-MM-DD}/` for plans/research that should be quarantined
3. Reference the archive paths in the tracker (so future runs can recover prior work).
4. Confirm with the user that the archive scope is correct before continuing.

### Continuation mode (default)
Default when no greenfield phrase is present.

Conductor MUST:
1. Acknowledge prior assets explicitly in tracker §0 (links + summary).
2. State whether the new plan extends or replaces each prior asset.
3. Never silently overwrite prior plans/skills.

---

## Scope-Change Re-Validation

Any change mid-pipeline to:
- Approach count (e.g. 3 → 2),
- Layer scope (e.g. adding/removing Flutter),
- Selected approach,
- Feature requirements (added or dropped),

MUST trigger a Phase-N critic re-run on the prior phase before proceeding.

Plans marked `## SUPERSEDED` without an accompanying re-validation note are **rejected** by `phase-verify.sh` and the Phase 2 critic.

The re-validation note must include:
- What changed (one paragraph)
- Why the prior phase output is still valid OR what was updated
- Date + critic verdict reference

---

## Phase-Completion Contracts

Every phase exit requires `phase-verify.sh {feature} {phase-num}` to return exit 0. The conductor refuses to advance otherwise.

Run from the workspace root:
```bash
.claude/scripts/phase-verify.sh {EPIC-ID} {phase-number}
```

Contracts (enforced by the script):

| Phase | Contract |
|---|---|
| 0 | Tracker exists with Environment Readiness section |
| 1 | Research doc(s) exist, ≥5 external URL citations, critic verdict not BLOCKED |
| 2 | ADR + plan files created, no SUPERSEDED plans without re-validation, critic verdict not BLOCKED |
| 3 | PR(s) referenced in tracker, branches match `feature/{epic}-{approach-name}`, plan: commits newer than feat:/fix: commits per worktree branch |
| 6 | Deploy notification fired (in notifications.log), smoke test 200, env URL in tracker |
| 7 | Test pass rate 100%, evidence dir populated, no unresolved blockers in review |
| 9 | Cleanup section present in tracker; cleanup commits visible in PR diffs |

If `phase-verify.sh` returns exit 1, the conductor MUST surface the JSON output to the user, fix the mismatches/blockers, and re-run before declaring the phase done.

---

## Phase 1 Corrections Inheritance

When the Phase 1 critic returns BLOCKED with factual corrections, the Phase 2 plan MUST include a section titled "Phase 1 Corrections Applied" that explicitly cites each corrected finding.

**Phase 2 critic gate:** any Phase-1 critic blocker not addressed in the Phase-2 plan = BLOCKED.

The plan template (`docs/plans/_PLAN_TEMPLATE.md`) provides the table format. If Phase 1 had no blockers, the plan must explicitly state "No Phase 1 corrections required."

---

## Environment Readiness Gate

Phase 0 starts with a hard pre-flight check. ANY failure is a Phase 0 BLOCKER (not advisory).

Required smoke tests:
- `/mcp` — confirm all configured MCP servers are connected (atlassian, codex, datadog, figma, livekit-docs, pal, playwright, etc.)
- `dotnet --version` — .NET 8 SDK present
- `python3 --version` — Python 3.12+ present
- `gh --version` — GitHub CLI present and authenticated (`gh auth status`)
- `mcp__pal__listmodels` — PAL MCP responsive

Document the readiness check result in tracker §0 (one-line per check, with version/output excerpt). If any check fails, do NOT advance to Phase 1 — surface the failure and fix it first.
