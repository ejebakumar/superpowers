---
name: feature-approaches
description: "Use after the architecture decision phase has defined the 3 approaches for a feature and they are ready to be implemented."
---

# Feature Approaches — Multi-Approach Implementation

Implement 3 distinct approaches for a feature, each in its own branch with a PR, following the architecture decision from the ADR.

## Compose These Disciplines

This runbook executes on the superpowers engine — invoke these skills, don't reimplement them:

- `superpowers:using-git-worktrees` + `superpowers:dispatching-parallel-agents` — one isolated worktree per approach, all three implemented concurrently; never fall back to a sequential single-branch run.
- `superpowers:plan-adherence` — each implementer follows its approach's plan from the ADR; any drift requires amending the plan first, not improvising.

## Constants

```
JIRA_CLOUD_ID = "151636d7-9099-4803-a108-4f053f36c9fe"
```

## Prerequisites

- ADR document exists with 3 defined approaches (from Phase 2)
- Research document exists with affected files list (from Phase 1)
- Sub-tasks exist in Jira for Approach A, B, C (from Phase 0)

## Agent Identity System

Each approach is implemented by a **named agent**. This identity is used in all Jira comments, PR descriptions, and review notes so stakeholders can track who did what.

| Approach | Agent Name | Identity | Role |
|----------|-----------|----------|------|
| A | **Maestro-Alpha** | First approach implementer | Full-stack implementation across all layers |
| B | **Maestro-Beta** | Second approach implementer | Full-stack implementation across all layers |
| C | **Maestro-Gamma** | Third approach implementer | Full-stack implementation across all layers |

Every Jira comment MUST be signed:
```
[Agent Maestro-Alpha] Implementation started for Approach A...
[Agent Maestro-Beta] PR created for Approach B...
[Agent Maestro-Gamma] Tests passing for Approach C...
```

---

## Instructions

## Plan Adherence Contract (MANDATORY)

The implementer agent works against a **Detailed Implementation Plan** committed at Phase 2 — file at `docs/plans/{EPIC-ID}-{approach-short-name}-plan.md`. This plan is the **source of truth**. The full contract is in `.claude/rules/feature-pipeline.md` § Plan Discipline. Summary:

1. **Read the full plan at spawn**, in the worktree, before writing any code
2. **Re-read Summary + Current State + next-step section every 3-5 file changes** (cheap, ~1K tokens — keeps plan fresh in context)
3. **Re-read the layer section at every layer handoff** (Python→.NET→Angular→Flutter)
4. **For ANY user redirect or blocker-driven deviation: run `/update-plan <change>` FIRST**, then implement
5. **Update the plan's Current State** after each completed step so the next check-in re-reads accurate state

**Pragmatic threshold for "must be in the plan":** any new file, any new public API/route, any cross-layer change, any DTO/request/response shape change, any new dependency. One-line tweaks within an existing function the plan already names don't need amendment.

**Critic enforces this at Phase 3.5** — undocumented drift = `BLOCKED` verdict, regardless of `CRITIC_MODE`.

---

### 1. Load Approach Definitions

Read the ADR from `docs/architecture/{id}-{feature}.md`. Extract for each approach:
- Name and description
- Key design decisions
- Which repos are affected
- Estimated complexity
- Which layers: Frontend (fe-workspace + flutter), Backend (.NET), Python (coach-builder + assistant)

### 1.5 Load Design Context (MANDATORY for FE work)

If a Figma URL was captured at intake or research (Phase 0/1):

1. **Load required skills:** `figma:figma-use` + `figma:figma-implement-design`
2. **Read saved artifacts** in `docs/builds/{EPIC-ID}-design/`:
   - `figma-screenshot.png` — visual ground truth
   - `figma-tokens.json` — design tokens to map to Apollo
   - `figma-code-connect.json` — component mappings (REUSE, don't reinvent)
   - `figma-context.md` — extracted layout, states, components
3. **Re-fetch fresh context** at implementation time (designs may have evolved since research):
   ```
   mcp__plugin_figma_figma__get_design_context({fileKey, nodeId})
   mcp__plugin_figma_figma__get_screenshot({fileKey, nodeId})
   ```
4. **Implementation rules:**
   - **Code Connect mappings are LAW** — if a Figma component maps to `apo-button`, use `apo-button`. Never re-implement a mapped component.
   - **Tokens map to Apollo** — convert Figma tokens (`color/primary/500`) to Apollo CSS variables (`--apollo-color-primary-500`). Flag gaps; never introduce raw hex.
   - **Figma output is REFERENCE** — Figma returns React+Tailwind by default. Adapt to:
     - Angular: standalone components + Signals + NgxHttpClient + Apollo
     - Flutter: DegreedCubit + safeEmit + Freezed + Apollo Flutter components
   - **All visible states must be implemented** — default, hover, focus, loading, error, empty, disabled (per the captured states list)

If NO Figma URL exists: load `degreed-design-system` skill instead and use the approved HTML mockup from intake as the visual reference.

### 2. Launch Parallel Worktree Agents

**IMPORTANT:** All 3 approaches run IN PARALLEL. Each agent gets its own **isolated worktree** so they don't interfere with each other's file changes.

#### 2.1 Workspace Structure & Worktrees

**CRITICAL:** `maestro_repo_ai_native/` is a WORKSPACE FOLDER, not a git repo. It contains 5 independent git repos:
```
maestro_repo_ai_native/          ← NOT a git repo, just a folder
├── Degreed/                     ← independent git repo
├── degreed-coach-builder/       ← independent git repo
├── degreed-assistant/           ← independent git repo
├── fe-workspace/                ← independent git repo
└── degreed-flutter/             ← independent git repo
```

**`isolation: "worktree"` works at the workspace level** — it creates an isolated copy of the entire workspace folder so agents don't conflict. But because the workspace root isn't a git repo, the agent must `cd` into each individual repo to run git commands.

**Each agent MUST:**
1. Work within the isolated worktree path it receives
2. `cd` into each repo subdirectory before running git commands
3. Create branches PER REPO (not at the workspace level)

```bash
# CORRECT — cd into each repo within the worktree
cd degreed-coach-builder && git checkout -b feature/PD-1234-approach-a-strategy
cd ../Degreed && git checkout -b feature/PD-1234-approach-a-strategy
cd ../fe-workspace && git checkout -b feature/PD-1234-approach-a-strategy
cd ../degreed-flutter && git checkout -b feature/PD-1234-approach-a-strategy

# WRONG — running git at workspace root (will fail, not a git repo)
git checkout -b feature/PD-1234-approach-a-strategy  # ❌ fails
```

**Each agent MUST push and create PRs PER REPO:**
```bash
cd degreed-coach-builder && git push -u origin feature/PD-1234-approach-a-strategy
cd degreed-coach-builder && gh pr create --title "..." --body "..."

cd ../Degreed && git push -u origin feature/PD-1234-approach-a-strategy
cd Degreed && gh pr create --title "..." --body "..."

# ... same for fe-workspace and degreed-flutter
```

#### 2.2 The Exact Agent Calls

Send ALL 3 Agent calls in a **single message** so they launch simultaneously:

```python
# These 3 calls go in ONE message block — they run in parallel
Agent({
  description: "Maestro-Alpha: Implement Approach A",
  model: "opus",                            # <-- Claude Opus 4.6, 1M context
  isolation: "worktree",                    # <-- isolated filesystem copy
  prompt: """You are Agent Maestro-Alpha implementing Approach A for {EPIC-ID}.

IDENTITY: You are Maestro-Alpha. Sign ALL Jira comments with [Agent Maestro-Alpha].

EPIC: {EPIC-ID} — {title}
JIRA SUB-TASK: {approach-a-subtask-id}
JIRA CLOUD ID: 151636d7-9099-4803-a108-4f053f36c9fe

APPROACH A SPEC (from ADR):
{paste the full Approach A section from the ADR}

RESEARCH CONTEXT:
{paste the key affected files and dependency impact matrix from the research doc}

REQUIREMENTS:
{paste the requirements list from intake}

YOUR TASK — implement Approach A as a full-stack feature across ALL layers:

1. Post a starting Jira comment on {approach-a-subtask-id}:
   "[Agent Maestro-Alpha] Starting implementation of Approach A: {name}"

2. Create feature branches in EACH affected repo:
   - cd degreed-coach-builder && git checkout -b feature/{epic-id}-approach-a-{short-name}
   - cd Degreed && git checkout -b feature/{epic-id}-approach-a-{short-name}
   - cd fe-workspace && git checkout -b feature/{epic-id}-approach-a-{short-name}
   - cd degreed-flutter && git checkout -b feature/{epic-id}-approach-a-{short-name}

3. Implement across all layers following these conventions:
   - Python (degreed-coach-builder): Python 3.12, FastAPI async, Strategy pattern, DegreedApiService for .NET callbacks
   - .NET (Degreed): .NET 8 / C# 11, Controller→Orchestrator→Service, ValidateCoachAccessAttribute
   - Angular (fe-workspace): Angular 20, Signals + Facade, NgxHttpClient, Apollo design system components
   - Flutter (degreed-flutter): Flutter 3.35, DegreedCubit + safeEmit (NOT standard Cubit), Freezed, GetIt DI

4. For ALL frontend UI (Angular + Flutter), follow WCAG 2.2 AA accessibility patterns:
   - Icon-only buttons: use tw-sr-only span or aria-label
   - Disabled buttons: use aria-disabled="true", NOT native disabled
   - Modals: trap focus, Escape to close, restore focus on close
   - Dynamic content: use aria-live regions for announcements
   - Form errors: use aria-invalid + aria-describedby
   - Keyboard: all interactions must work without mouse
   - See shared/a11y-patterns.md for full pattern catalog

5. BEFORE writing ANY Angular code, you MUST complete these PRE-IMPLEMENTATION STEPS:

   ## MANDATORY: Load Design System Skill First
   **BEFORE writing a SINGLE line of Angular/Flutter UI code:**
   1. Load skill: `degreed-fe-workspace:apollo-design-system`
   2. Check `libs/shared/apollo/` for existing components
   3. Use Apollo components — NEVER build raw Tailwind when Apollo exists:
      - `DrawerService` for drawers/panels (NOT raw CDK Dialog)
      - `da-button` for buttons (NOT custom Tailwind buttons)
      - `da-icon` for icons (NOT raw SVG or heroicons directly)
      - `da-input`, `da-textarea` for form inputs
      - `ToastService` for notifications
      - `DialogService` for modals

   **FAILURE TO LOAD THIS SKILL = UI WILL BE REJECTED.**
   Raw Tailwind components that duplicate Apollo functionality are not acceptable.

   ## FE IMPLEMENTATION GATES (internalize these):

   ## RxJS Operator Selection (MUST FOLLOW)
   | Use Case | Correct Operator | Why |
   |----------|-----------------|-----|
   | Search/typeahead | switchMap + debounceTime(300) + distinctUntilChanged | Cancel previous, only latest |
   | Form submit/button click | exhaustMap | Prevent double-click |
   | Ordered operations | concatMap | Wait for previous |
   | Parallel fetches | forkJoin or mergeMap(fn, concurrency) | Concurrent execution |

   WRONG patterns (NEVER DO):
   - switchMap on form submit → loses requests → use exhaustMap
   - Nested subscribes → use higher-order operators
   - subscribe() just to set property → use async pipe
   - catchError OUTSIDE switchMap → kills stream → move inside
   - BehaviorSubject for simple state → use signal()

   ## Degreed Service Usage (MUST FOLLOW)
   | Service | Correct Pattern |
   |---------|----------------|
   | DrawerService | MUST subscribe to afterClosed() |
   | DialogService | MUST handle afterClosed() result |
   | NgxHttpClient | Use catchAndSurfaceError() for errors |
   | AuthService | authService.authUser?.prop with null checks |
   | TranslateService | translateWithDefaults() or DgxTranslatePipe |
   | WebEnvironmentService | getBlobUrl() for assets, NOT hardcoded URLs |
   | LDFlagsService | isEnabled() for feature flags, NOT hardcoded |
   | ToastService | showToast() with type, NOT alert() |

   ## Memory Leak Prevention (MUST FOLLOW)
   - In constructor: takeUntilDestroyed() works directly
   - In ngOnInit/methods: takeUntilDestroyed(this.destroyRef) — inject DestroyRef first
   - FormGroup valueChanges: MUST have takeUntilDestroyed
   - Event listeners: MUST removeEventListener in ngOnDestroy
   - Timers: MUST clearInterval/clearTimeout
   - Async pipe: preferred for template subscriptions (auto-unsubscribes)

   ## Component Reuse (CHECK BEFORE CREATING)
   Before creating ANY new component/utility:
   1. Search libs/apollo/ for existing Apollo component
   2. Search libs/shared/ for existing utility
   3. Search @degreed/core/utils for existing helper (generateGuid, camelCaseKeys, etc.)
   4. Search existing feature folders for similar patterns
   If it exists → USE IT. Don't recreate.

   ## MANDATORY: Figma-Driven Discovery Gate
   **🚨 HARD STOP: You MUST complete these steps BEFORE creating ANY new model or component.**
   **This is NOT optional. Skipping this gate = PR rejection.**

   ### Step 1: LOOK AT FIGMA/DESIGN FIRST
   **Before ANY code search, identify what UI elements exist in the design:**
   - What kind of interface? (chat, form, dashboard, list, etc.)
   - What components? (drawer, modal, tabs, buttons, inputs, etc.)
   - What data shapes? (messages, items, users, settings, etc.)

   ### Step 2: AUTO-GENERATE Searches from Design
   **Based on what you SAW, search for matching patterns:**
   ```bash
   # Generate keywords from Figma analysis
   # Example: Figma shows "chat with messages in a side drawer"
   KEYWORDS="chat message conversation drawer"

   # Search for models matching those keywords
   for kw in $KEYWORDS; do
     grep -r "export interface.*$kw" apps/lxp/src/app/ --include="*.ts" -i | head -10
   done

   # Search for components matching those keywords
   for kw in $KEYWORDS; do
     find apps/lxp/src/app -iname "*$kw*" -type d
   done

   # ALWAYS check Apollo first for standard UI elements
   ls libs/shared/apollo/angular/src/lib/components/
   ```

   ### Step 2: READ Found Models/Components
   **If search found similar models, READ them to understand:**
   - What fields/properties they have
   - What they're missing that you need
   - Whether they can be extended

   ### Step 3: TRY to Extend First (MANDATORY)
   **Your DEFAULT action is to EXTEND, not create new.**
   ```typescript
   // WRONG: Creating a parallel model (DUPLICATES EXISTING)
   interface AskMaestroMessage {
     id: string;
     role: 'user' | 'assistant';
     content: string;
     timestamp: Date;
   }

   // RIGHT: Extend the existing model (ADDS ONLY WHAT'S NEW)
   import { ChatMessage } from '@app/degreed-coach/models';

   interface AskMaestroMessage extends ChatMessage {
     skill?: AskMaestroSkill;  // Only add domain-specific fields
     metadata?: { ... };       // Only add what ChatMessage doesn't have
   }
   ```

   ### Step 4: ASK CLARIFYING QUESTIONS (If Unsure)
   **If you're unsure whether to extend or create new, STOP and ask the user:**

   ```markdown
   ## Model/Component Decision Needed

   I found existing model `ChatMessage` in `@app/degreed-coach/models` with fields:
   - messageId, conversationId, senderType, messageText, isUser, messageTimestamp...

   For the new feature, I need:
   - skill routing (which agent handles this)
   - entity metadata (for side-by-side editing)

   **Options:**
   1. **EXTEND ChatMessage** — Add `skill` and `metadata` fields, reuse existing infrastructure
   2. **CREATE separate model** — If ChatMessage is tightly coupled to coach domain

   **My recommendation:** Option 1 (extend) because the field structure is 90% identical.

   **Do you want me to:**
   - [ ] Extend ChatMessage (recommended)
   - [ ] Create a new model (explain why ChatMessage doesn't fit)
   - [ ] Make ChatMessage generic and use it directly
   ```

   **WAIT for user response before proceeding.**

   ### Step 5: Decision Tree (Use After Steps 1-4)
   ```
   Need new model/component?
   │
   ├─► Did you SEARCH first? (Step 1)
   │   ├─► NO → 🛑 STOP. Go back and search.
   │   └─► YES ↓
   │
   ├─► Did you find similar existing?
   │   ├─► YES → Can you EXTEND it?
   │   │         ├─► YES → ✅ EXTEND IT. Don't create new.
   │   │         ├─► UNSURE → 🛑 ASK USER (Step 4)
   │   │         └─► NO (with evidence) → Document WHY, then create with shared base
   │   └─► NO → Create new, but use shared patterns from table below
   ```

   ### What "EXTEND" Means in Practice

   **For Models:**
   ```typescript
   // Import the base
   import { ChatMessage } from '@app/degreed-coach/models';

   // Extend with only new fields
   export interface AskMaestroMessage extends ChatMessage {
     skill?: AskMaestroSkill;
   }

   // Create helper functions that return the extended type
   export function createUserMessage(content: string, sessionId: string): AskMaestroMessage {
     return {
       senderType: 'User',        // Use BASE model field names
       messageText: content,       // NOT custom field names
       isUser: true,
       messageTimestamp: new Date().toISOString(),
       sessionId,
     };
   }
   ```

   **For Components:**
   - Can you add optional `@Input()` to existing component?
   - Can you use content projection (`<ng-content>`)?
   - Can you create a shared base class both extend?

   **If creating new: Document the decision in a code comment (see "If NOT Importing" section).**

   ## Existing Pattern Consistency (MANDATORY FOR UI)

   ### KNOWN UI PATTERNS — Reference Components Table
   **USE THIS TABLE FIRST.** Don't search blindly — these are the canonical implementations:

   | UI Pattern | Reference Component | Path | Key Styling |
   |------------|---------------------|------|-------------|
   | **Chat input** | `CoachConversationInputComponent` | `degreed-coach/components/coach-conversation-input-v2/` | Container: `tw-rounded-lg tw-border tw-border-neutral-200 focus-within:tw-border-primary-700 focus-within:tw-shadow-lg`. Textarea: borderless (`!tw-border-none tw-bg-transparent`). Send button: `tw-btn-primary tw-btn-icon tw-btn-small` with `arrow-up` icon |
   | **Chat messages** | `CoachConversationVirtualizedComponent` | `degreed-coach/components/coach-conversation-virtualized/` | Virtual scroll, message bubbles with role-based styling |
   | **Message bubble (assistant)** | See coach-conversation templates | `degreed-coach/components/` | `tw-rounded-2xl tw-rounded-tl-none tw-bg-neutral-100`, avatar with `tw-bg-primary-100` |
   | **Message bubble (user)** | See coach-conversation templates | `degreed-coach/components/` | `tw-rounded-2xl tw-rounded-tr-none tw-bg-primary-700 tw-text-white` |
   | **Typing indicator** | Inline in coach templates | `degreed-coach/components/` | 3 bouncing dots with `tw-animate-bounce` and staggered delays |
   | **File upload chip** | `CoachFileUploadChipComponent` | `degreed-coach/components/coach-file-upload-chip/` | Pill with file icon, close button, loading state |
   | **Suggestion pills** | See coach-prompts-v2 | `degreed-coach/components/coach-prompts-v2/` | `tw-rounded-full tw-border tw-border-neutral-300` with hover states |
   | **Side drawer** | `DrawerService` | Apollo (`@degreed/apollo`) | MUST use Apollo DrawerService, NOT raw CDK Dialog |
   | **Toast notifications** | `ToastService` | Apollo (`@degreed/apollo`) | MUST use Apollo ToastService |
   | **Modal dialogs** | `DialogService` | Apollo (`@degreed/apollo`) | MUST use Apollo DialogService |
   | **Icon buttons** | `da-icon` + button | Apollo | `tw-btn-primary tw-btn-icon tw-btn-small` wrapper |
   | **Form inputs** | `da-input`, `da-textarea` | Apollo | Use Apollo, NOT raw HTML inputs |
   | **Tabs** | `da-tabs` | Apollo | Use Apollo TabsComponent |
   | **Markdown rendering** | `MarkdownToHtmlPipe` | `@app/markdown/pipes/` | Has sanitization, link handling, image proxying. NEVER use custom innerHTML with regex |

   ### If Pattern NOT in Table
   Only if your UI pattern is NOT listed above, then search:
   ```bash
   find apps/lxp/src/app -name "*{pattern}*" -type f
   grep -r "class pattern" apps/lxp/src/app/degreed-coach/
   ```

   ### Pattern Matching Rules
   When using a reference component:
   1. **READ the component** — understand HTML structure, CSS classes, behavior
   2. **MATCH exactly** — use the SAME container, icon, button classes
   3. **IMPORT if complex** — don't rebuild, import the existing component

   ### If NOT Importing — Document WHY (MANDATORY)
   If you decide NOT to import an existing component, you MUST document the reason:

   **Valid reasons to NOT import:**
   - Different data model (e.g., `ChatMessage` vs `AskMaestroMessage`)
   - Tightly coupled to domain-specific features (e.g., `CoachSkillAssessmentSummary`)
   - Would require significant refactoring to make generic
   - Performance concerns (e.g., virtual scroll not needed for small lists)

   **Document in code comment:**
   ```typescript
   /**
    * Custom chat messages implementation.
    * NOT using coach-conversation-v2 because:
    * - Different model: AskMaestroMessage vs ChatMessage
    * - No need for: feedback forms, skill assessment, profile pics
    * - Styling matches coach-conversation-v2 patterns
    */
   ```

   **LESSON LEARNED:** Building a chat input from scratch with raw Tailwind instead of matching
   `coach-conversation-input-v2` resulted in inconsistent styling. Always check this table first.

   ## Common Mistakes to Avoid
   - Custom stopEvent() → use e.preventDefault()/e.stopPropagation()
   - filter()[0] → use find()
   - filter().length → use some()/every()
   - indexOf() !== -1 → use includes()
   - || for defaults → use ?? (nullish coalescing)
   - && chains → use optional chaining ?.
   - document.querySelector → use ViewChild
   - innerHTML → use Angular binding

   ## Framework Defaults — NEVER Over-Customize

   **🚨 CRITICAL: Use framework defaults UNLESS the user EXPLICITLY requests customization.**

   ### The "It Makes Sense" Trap (AVOID THIS)
   ```
   WRONG thinking:
   "This is a chat interface, so it makes sense to hide the drawer's Save/Cancel buttons"
   → You just made an assumption the user didn't ask for

   RIGHT thinking:
   "User didn't mention buttons, so I'll use the drawer's default configuration (buttons visible)"
   → Let the user decide what to customize
   ```

   ### Default Behavior Rules
   | Component | Default | Only Customize If User Says... |
   |-----------|---------|-------------------------------|
   | DrawerService buttons | VISIBLE (Cancel + Save) | "hide buttons", "no footer", "custom footer" |
   | Dialog close button | ENABLED | "prevent close", "disable X button" |
   | Form validation | ENABLED | "skip validation", "no validation" |
   | Animations | ENABLED | "no animations", "disable transitions" |
   | Toast auto-dismiss | ENABLED | "persistent toast", "don't auto-dismiss" |
   | Loading states | SHOW SPINNER | "no loading indicator", "silent loading" |

   ### Before Customizing, Ask Yourself
   1. Did the user EXPLICITLY request this customization?
   2. If not → **USE THE DEFAULT**
   3. If unsure what the default is → **READ the component source code**

   ### Lesson Learned
   ```
   Bad: Set `buttons: { primaryButton: { visible: false } }` because "chat has its own input"
   User reaction: "drawer suppose to have cancel and other button"
   Correct: Use default drawer config, let user request customizations
   ```

6. Write tests in each repo and run them:
   - cd degreed-coach-builder && make test
   - cd Degreed/trunk && ./dg.ps1 t
   - cd fe-workspace && nx affected -t test
   - cd degreed-flutter && flutter test

7. PRE-COMMIT SELF-CHECK (RUN BEFORE COMMITTING FE CODE):
   Before committing Angular/Flutter code, verify ALL of these:
   - [ ] **DESIGN SYSTEM LOADED** — did you load `degreed-fe-workspace:apollo-design-system` skill?
   - [ ] **NO RAW TAILWIND DUPLICATES** — checked libs/shared/apollo/ before creating any component?
   - [ ] **PATTERN CONSISTENCY** — searched codebase for existing similar UI patterns and matched them?
   - [ ] **MODEL EXTENSION** — extended existing models (ChatMessage, etc.) instead of creating duplicates?
   - [ ] **COMPONENT REUSE** — checked for existing components with readOnly/mode flags before building?
   - [ ] **FRAMEWORK DEFAULTS** — using default configs, NOT customizing unless user explicitly requested?
   - [ ] Using DrawerService (NOT raw CDK Dialog or custom drawer)
   - [ ] Using da-button, da-icon, da-input (NOT raw Tailwind buttons/inputs)
   - [ ] No nested subscribes (use switchMap/exhaustMap/concatMap)
   - [ ] All subscriptions use takeUntilDestroyed() or async pipe
   - [ ] DrawerService/DialogService calls subscribe to afterClosed()
   - [ ] Form submits use exhaustMap (NOT switchMap)
   - [ ] Search inputs use switchMap + debounceTime + distinctUntilChanged
   - [ ] catchError is INSIDE switchMap (not outside)
   - [ ] No hardcoded user-facing strings (all use translate())
   - [ ] No new components when Apollo/shared equivalent exists
   - [ ] No custom utilities when @degreed/core/utils has equivalent
   - [ ] Icon-only buttons have accessible names
   - [ ] Disabled buttons use aria-disabled, NOT native disabled

   If ANY check fails, FIX IT before committing. Do not proceed with violations.

9. Commit all changes with descriptive messages referencing {EPIC-ID}.

10. Push branches and create PRs in each repo via gh pr create.

11. Post a completion Jira comment on {approach-a-subtask-id} with all PR links.

IMPORTANT: You are working in an isolated worktree copy of the workspace folder.
The workspace root is NOT a git repo — it's just a folder containing 5 independent repos.
You MUST cd into each repo subdirectory before running any git commands.

BEFORE creating any branch, ALWAYS pull the latest base branch first:
  cd degreed-coach-builder && git checkout main && git pull origin main && git checkout -b feature/...
  cd ../Degreed && git checkout main && git pull origin main && git checkout -b feature/...
  cd ../fe-workspace && git checkout main && git pull origin main && git checkout -b feature/...
  cd ../degreed-flutter && git checkout main && git pull origin main && git checkout -b feature/...
{If a base branch other than main was specified, use that instead.}

NEVER run git commands at the workspace root — it will fail.
Your file changes do not affect the other agents or the main workspace."""
})

Agent({
  description: "Maestro-Beta: Implement Approach B",
  model: "opus",                            # <-- Claude Opus 4.6, 1M context
  isolation: "worktree",                    # <-- separate isolated copy
  prompt: """You are Agent Maestro-Beta implementing Approach B for {EPIC-ID}.
  ... [same structure, with Approach B spec and approach-b-subtask-id] ..."""
})

Agent({
  description: "Maestro-Gamma: Implement Approach C",
  model: "opus",                            # <-- Claude Opus 4.6, 1M context
  isolation: "worktree",                    # <-- separate isolated copy
  prompt: """You are Agent Maestro-Gamma implementing Approach C for {EPIC-ID}.
  ... [same structure, with Approach C spec and approach-c-subtask-id] ..."""
})
```

#### 2.3 What Happens Under the Hood

```
Main workspace: maestro_repo_ai_native/     ← NOT a git repo
    │
    ├── Worktree A (Maestro-Alpha)          ← isolated COPY of the workspace folder
    │   ├── degreed-coach-builder/          ← git repo, branch: feature/{epic}-approach-a-{name}
    │   ├── Degreed/                        ← git repo, branch: feature/{epic}-approach-a-{name}
    │   ├── fe-workspace/                   ← git repo, branch: feature/{epic}-approach-a-{name}
    │   ├── degreed-flutter/                ← git repo, branch: feature/{epic}-approach-a-{name}
    │   └── degreed-assistant/              ← git repo (only if DGA in scope)
    │
    ├── Worktree B (Maestro-Beta)           ← isolated COPY of the workspace folder
    │   ├── degreed-coach-builder/          ← git repo, branch: feature/{epic}-approach-b-{name}
    │   ├── Degreed/                        ← git repo, branch: feature/{epic}-approach-b-{name}
    │   └── ...
    │
    └── Worktree C (Maestro-Gamma)          ← isolated COPY of the workspace folder
        ├── degreed-coach-builder/          ← git repo, branch: feature/{epic}-approach-c-{name}
        ├── Degreed/                        ← git repo, branch: feature/{epic}-approach-c-{name}
        └── ...
```

- All 3 agents run concurrently — no waiting
- Each agent `cd`s into each repo subdirectory for git operations (the workspace root is NOT a git repo)
- Each creates branches PER REPO, writes code, runs tests, pushes, creates PRs independently
- When all 3 finish, the orchestrator collects PR links and presents the checkpoint
- Worktrees with changes are kept (branches are pushed); empty worktrees are auto-cleaned

#### 2.4 Context the Orchestrator Must Inline

Each agent starts with ZERO context — it doesn't see this conversation. The orchestrator MUST paste these into the prompt (not just reference skill names):

1. **Agent identity** — Name and approach letter
2. **Epic context** — EPIC-ID, title, requirements summary
3. **Approach spec** — The FULL approach section from the ADR (copy-pasted, not a file path reference)
4. **Research context** — Key affected files and dependency impact matrix
5. **Jira sub-task ID** — The specific sub-task for this approach
6. **Stack conventions** — Key coding standards per repo (inlined, not "load the skill")
7. **Layer expectations** — Which repos to touch:
   - **Frontend:** fe-workspace (Angular 20) + degreed-flutter (Flutter 3.35)
   - **Backend:** Degreed (.NET 8 / C# 11 controllers, orchestrators, domain models)
   - **Python:** degreed-coach-builder (Python 3.12 / FastAPI) + degreed-assistant (if DGA scope)
8. **Signing requirement** — All Jira comments signed with `[Agent {name}]`
9. **Worktree awareness** — Tell the agent it's in an isolated worktree and its changes won't affect others

### 3. What Each Agent Does (Per Approach)

Each agent independently executes steps 3.1–3.6:

#### 3.1 Post Starting Comment on Jira

Via `mcp__atlassian__addCommentToJiraIssue` on the approach sub-task:

```
[Agent Maestro-{Alpha|Beta|Gamma}] Starting implementation of Approach {A|B|C}: {name}

Affected repos: {list}
Affected layers:
- Frontend: fe-workspace (Angular 20) + degreed-flutter (Flutter 3.35)
- Backend: Degreed (.NET 8 / C# 11)
- Python: degreed-coach-builder (Python 3.12 / FastAPI)

Estimated files: {count}
```

#### 3.2 Create Feature Branches (from latest)

**ALWAYS pull the latest base branch before creating the feature branch.** Never branch from a stale local copy.

Default base is `main`. If the user provided a different base branch, use that.

```bash
# For EACH repo: checkout base → pull latest → create feature branch
cd degreed-coach-builder && git checkout main && git pull origin main && git checkout -b feature/{epic-id}-approach-{x}-{name}
cd Degreed && git checkout main && git pull origin main && git checkout -b feature/{epic-id}-approach-{x}-{name}
cd fe-workspace && git checkout main && git pull origin main && git checkout -b feature/{epic-id}-approach-{x}-{name}
cd degreed-flutter && git checkout main && git pull origin main && git checkout -b feature/{epic-id}-approach-{x}-{name}
# Only if DGA is in scope:
cd degreed-assistant && git checkout main && git pull origin main && git checkout -b feature/{epic-id}-approach-{x}-{name}

# If user specified a base branch (e.g., "use release/2025.2.1"):
cd degreed-coach-builder && git checkout release/2025.2.1 && git pull origin release/2025.2.1 && git checkout -b feature/{epic-id}-approach-{x}-{name}
```

#### 3.3 Load Stack Conventions

Reference the appropriate conventions for each repo:

| Repo | Skill | Key Standards |
|------|-------|--------------|
| degreed-coach-builder | `degreed-coach-builder-stack` | Python 3.12, FastAPI async, Strategy pattern, DegreedApiService |
| Degreed | `degreed-dotnet-stack` | .NET 8, C# 11, Controller→Orchestrator→Service, ValidateCoachAccess |
| fe-workspace | `degreed-frontend-stack` | Angular 20, Signals+Facade, NgxHttpClient, Apollo design system |
| degreed-flutter | `degreed-flutter-stack` | Flutter 3.35, DegreedCubit+safeEmit, Freezed, GetIt DI |
| degreed-assistant | `degreed-assistant-stack` | Python 3.11, LangChain, AgentUtils |

#### 3.4 Implement — Contract-First, Layered Order

**CRITICAL:** Each agent owns the FULL vertical slice for its approach — Python + .NET + Angular + Flutter. There is NO cross-agent API contract problem because one agent builds both the producer AND consumer of every API.

But the agent MUST build layers **in the correct order** so each layer's contract is defined before its consumer is built.

##### Implementation Order (Bottom-Up)

```
Step 1: DEFINE THE API CONTRACT (on paper, before writing code)
    │   ↓
Step 2: PYTHON (degreed-coach-builder) — Build the endpoint
    │   ↓
Step 3: .NET (Degreed) — Build the proxy that calls Python
    │   ↓
Step 4: FRONTEND (fe-workspace + degreed-flutter) — Build the UI that calls .NET
    │   ↓
Step 5: PYTHON CALLBACKS (if needed) — Python calling back to .NET
```

##### Step 1: Define the API Contract First

Before writing ANY code, the agent defines the contract for each new/modified endpoint:

```markdown
## API Contract: {endpoint name}

### Python Endpoint (degreed-coach-builder)
Route: POST /dgcb/api/{feature}/{action}
Request Body:
  {
    "session_id": "string",
    "field1": "string",
    "field2": int
  }
Response: SSE stream | JSON
  {
    "status": "success",
    "data": { ... }
  }
Headers: Authorization: Bearer {token}, X-Internal-Key: {key}

### .NET Proxy (Degreed)
Route: POST /api/{feature}/{action}
Controller: {Feature}Controller.cs
Orchestrator: {Feature}Orchestrator.cs
Route Constant: CoachAIBackendRoutes.{FeatureAction}
Forwards to: Python endpoint above
Request mapping: camelCase (Angular) → snake_case (Python)
Response mapping: snake_case (Python) → camelCase (Angular)

### Angular Service (fe-workspace)
Service: {feature}-api.service.ts
Method: {action}(params): Observable<{ResponseType}>
Calls: NgxHttpClient.post('/api/{feature}/{action}', body)
Interface: {ResponseType} in {feature}.model.ts

### Flutter Service (degreed-flutter)
Repository: {feature}_repository.dart
Method: Future<{ResponseModel}> {action}({params})
Calls: Dio.post('/api/{feature}/{action}', data: body)
Model: {ResponseModel} with Freezed
```

This contract is the agent's internal blueprint. It writes this FIRST, then implements each layer to match.

##### Step 2: Build Python Endpoint (Producer)

The Python endpoint is the **source of truth** for the API — build it first.

```
degreed-coach-builder/backend/app/api/{feature}/router.py
```

Conventions:
- FastAPI async endpoint with Pydantic request/response models
- Strategy pattern for prompt strategies if LLM-involved
- `DegreedApiService` + `EndpointRegistry` for .NET callbacks
- Redis `SessionDataModel` for session state
- Structured JSON logging with PII masking
- Full async/await, `asyncio.gather()` for parallelism

##### Step 3: Build .NET Proxy (Intermediary)

The .NET layer sits between the frontend and Python. It:
1. Receives the request from Angular/Flutter
2. Authenticates the user (cookies, Bearer, CSRF)
3. Enriches with user profile, org context, permissions
4. Forwards to Python with `Bearer` + `X-Internal-Key` headers
5. Pipes back the response (or SSE stream)

Implementation files (in this order):
```
1. CoachAIBackendRoutes.cs          ← Add the route constant
2. {Feature}Orchestrator.cs         ← Add the method that calls Python
3. {Feature}Controller.cs           ← Add the endpoint that calls the orchestrator
4. Request/Response DTOs            ← Match the Python models (camelCase)
```

Conventions:
- Controller → Orchestrator → Service pattern
- `ValidateCoachAccessAttribute` for auth on Maestro endpoints
- Route constant in `CoachAIBackendRoutes.cs`
- Named HttpClient "CoachAIBackend" via `IocPackage.cs` (600s timeout)
- `SendSseRequestAsync()` for SSE stream forwarding
- Filter `data: ping-pong` keepalives from SSE streams

##### Step 4: Build Frontend (Consumer)

Now the agent knows the exact .NET endpoint shape, so it builds both frontends:

**Angular (fe-workspace):**
```
1. {feature}.model.ts               ← TypeScript interfaces matching .NET DTOs
2. {feature}-api.service.ts         ← NgxHttpClient calls to .NET endpoints
3. {feature}.facade.ts              ← Signal-based state management
4. {feature}.component.ts/html      ← UI component using Apollo design system
5. {feature}.routes.ts              ← Lazy-loaded route with guards
```

**Figma Design Integration:**
When Figma designs are provided (URL or screenshot), extract and use:

1. **Design Tokens** — Use `mcp__figma__*` tools to extract:
   - Colors: Map to Apollo tokens (--apo-color-*, tw-* classes)
   - Typography: Map to Apollo text styles (tw-text-*, tw-font-*)
   - Spacing: Map to Tailwind spacing (tw-p-*, tw-m-*, tw-gap-*)
   - Border radius: Map to tw-rounded-*
   - Shadows: Map to tw-shadow-*

2. **Component Mapping** — Before building custom:
   - Identify Figma components → Map to Apollo equivalents
   - Buttons → apo-button with tw-btn-* variants
   - Inputs → apo-text-field, apo-textarea
   - Dialogs → apo-dialog via DialogService
   - Drawers → apo-drawer via DrawerService
   - Icons → da-icon with ariaLabel

3. **Token Extraction Pattern:**
   ```typescript
   // From Figma: fill="#1E40AF" → Map to Apollo/Tailwind
   // Use: tw-bg-primary-700 or var(--apo-color-primary-700)

   // From Figma: font-size="14px", font-weight="500"
   // Use: tw-text-sm tw-font-medium

   // From Figma: padding="16px 24px"
   // Use: tw-px-6 tw-py-4
   ```

4. **Visual Fidelity Check:**
   - Load `/degreed-fe-workspace:visual-design-fidelity` for pixel-perfect implementation
   - Treat Figma as source of truth for spacing, alignment, colors
   - Use Apollo tokens, NOT hardcoded hex values

Conventions:
- Angular Signals + Facade pattern for state
- NgxHttpClient with auto `/api` prefix and `dg-casing: 'camel'`
- Lazy-loaded routes with feature flag + permission guards
- Apollo design system components (check `libs/apollo/` first)
- **WCAG 2.2 AA accessibility** — follow `shared/a11y-patterns.md`
- **i18n translations** — all user-facing strings must be translated (see below)

**i18n Translation Pattern (REQUIRED for all user-facing strings):**

```typescript
// 1. Import translation utilities
import { TranslateFn, translateWithDefaults } from '@app/shared/utils';
import { TranslateService } from '@ngx-translate/core';

// 2. Setup in component (inject and build translate function)
protected readonly translateService = inject(TranslateService);
public translate: TranslateFn = translateWithDefaults(this.translateService);

// 3. Usage in template
{{ translate('Default Text', 'Translation_Key') }}
{{ translate('Hello {name}', 'Greeting_Msg', { name: userName }) }}

// 4. Usage in TypeScript (toasts, dynamic strings)
this.translate('Error occurred', 'Feature_ErrorText')
```

**Key Naming Convention:** `Category_Description`
- Prefix with feature area: `Coach_`, `Quiz_`, `Roleplay_`, `Maestro_`
- Descriptive suffix: `_Title`, `_Description`, `_Button`, `_Error`, `_Success`
- Examples: `Coach_HomeHeader`, `Quiz_SubmitButton`, `Roleplay_FeedbackTitle`

**Rules:**
- NEVER hardcode user-facing strings in templates or TypeScript
- Always provide a sensible default (first argument) as fallback
- Use params for dynamic values: `translate('Welcome {name}', 'Greeting', { name })`
- For base components, extend `ConsentBaseComponent` which provides `translate` automatically
- For standalone components, inject and build the translate function manually

**Flutter (degreed-flutter):**
```
1. {feature}_model.dart             ← Freezed model matching .NET DTOs
2. {feature}_repository.dart        ← Dio HTTP calls
3. {feature}_state.dart             ← Freezed state for Cubit
4. {feature}_cubit.dart             ← DegreedCubit with safeEmit
5. {feature}_screen.dart            ← UI widget
```

Conventions:
- `DegreedCubit<State>` with `safeEmit()` (NOT standard Cubit)
- Freezed for immutable states with `copyWith()`
- GetIt DI in `service_locator.dart`
- Flat module structure at `lib/{feature}/`
- `flutter_client_sse` for SSE streaming
- **WCAG 2.2 AA accessibility** — `Semantics` widgets, 48x48dp touch targets
- **i18n translations** — all user-facing strings via `AppLocalizations` (see below)

**i18n Translation Pattern (REQUIRED for all user-facing strings):**

```dart
// 1. Create feature-specific strings file: lib/{feature}/ui/{feature}_strings.dart
import 'package:degreed/core/localization/app_localizations.dart';

/// {Feature} localization strings — extension on [AppLocalizations].
/// Accessible via `context.intl.{feature}Xxx` after importing this file.
extension {Feature}Strings on AppLocalizations {
  // Basic string
  String get {feature}Title => t('Mobile_{feature}Title');

  // String with parameters
  String {feature}ItemCount(int count) => t('Mobile_{feature}ItemCount', params: {'count': '$count'});
}

// 2. Usage in widgets
import 'package:degreed/{feature}/ui/{feature}_strings.dart';

// Access via context.intl extension
Text(context.intl.{feature}Title)
Text(context.intl.{feature}ItemCount(5))
```

**Key Naming Convention:** `Mobile_{feature}{Description}`
- Prefix: Always `Mobile_`
- Feature area: `roleplay`, `quiz`, `coach`, etc.
- Description: `Title`, `Button`, `Error`, `Message`
- Examples: `Mobile_roleplayScenario`, `Mobile_quizSubmitButton`, `Mobile_coachHomeTitle`

**Rules:**
- NEVER hardcode user-facing strings in widgets
- Create a `{feature}_strings.dart` extension file for each feature
- Use params for dynamic values: `t('Mobile_key', params: {'name': value})`
- Shared strings (like `cancel`, `confirm`) can be aliased in feature strings file

##### Step 4.5: Apply Accessibility Patterns (WCAG 2.2 AA)

**CRITICAL:** All frontend UI must follow accessibility patterns from `shared/a11y-patterns.md`.

**Angular (fe-workspace) — Required Patterns:**

| Pattern | Requirement | Reference |
|---------|-------------|-----------|
| **Icon-only buttons** | Use `<span class="tw-sr-only">Label</span>` or `aria-label` | Section 1.1 |
| **Disabled buttons** | Use `aria-disabled="true"`, NOT native `disabled` | Section 2 |
| **Modals/dialogs** | Trap focus, Escape to close, restore focus on close | Section 3.1 |
| **Dropdowns/menus** | Arrow key navigation, Enter to select, Escape to close | Section 3.2 |
| **Dynamic content** | Use `aria-live="polite"` for status, `role="alert"` for errors | Section 4 |
| **Form errors** | Use `aria-invalid="true"` + `aria-describedby` | Section 5.2 |
| **Required fields** | Use `aria-required="true"` | Section 5.1 |
| **Visible focus** | Never remove `:focus-visible` without replacement | Section 3.3 |
| **Color contrast** | 4.5:1 for text, 3:1 for UI components | Section 6.2 |
| **Touch targets** | Minimum 24x24px, recommended 44x44px | Section 7 |

**Example implementations:**

```html
<!-- Icon-only button -->
<button (click)="delete()">
  <dg-icon name="trash" aria-hidden="true"></dg-icon>
  <span class="tw-sr-only">Delete item</span>
</button>

<!-- Disabled button (NOT native disabled) -->
<button
  [attr.aria-disabled]="isDisabled"
  [class.apo-button--disabled]="isDisabled"
  (click)="!isDisabled && onSubmit()">
  Submit
</button>

<!-- Status announcement -->
<div aria-live="polite" aria-atomic="true" class="tw-sr-only">
  {{ statusMessage }}
</div>

<!-- Form error -->
<input
  [attr.aria-invalid]="hasError ? 'true' : null"
  [attr.aria-describedby]="hasError ? 'field-error' : null">
<div id="field-error" *ngIf="hasError" role="alert">{{ errorMessage }}</div>
```

**Flutter (degreed-flutter) — Required Patterns:**

| Pattern | Requirement |
|---------|-------------|
| **Screen reader labels** | Use `Semantics(label: 'description')` |
| **Buttons** | Use `Semantics(button: true, label: 'action')` |
| **Touch targets** | Minimum 48x48 dp (Flutter default) |
| **Decorative images** | Use `ExcludeSemantics` or `semanticsLabel: ''` |
| **Dynamic content** | Use `SemanticsService.announce()` for announcements |

```dart
// Icon-only button with label
Semantics(
  button: true,
  label: 'Delete item',
  child: IconButton(
    icon: Icon(Icons.delete),
    onPressed: () => _delete(),
  ),
)

// Status announcement
SemanticsService.announce('Item saved successfully', TextDirection.ltr);
```

##### Step 5: Python Callbacks (if needed)

If the Python service needs to call BACK to .NET (e.g., to save data, fetch user info):

```
degreed-coach-builder/backend/app/dg_component/api_service/
  - endpoint_registry.py            ← Register the callback route
  - degreed_api_service.py          ← Add the callback method
```

This uses stored cookies from Redis to call .NET APIs as the authenticated user. The `EndpointRegistry` auto-routes between web and mobile paths.

##### Why This Order Matters

```
Python defines the shape     →  .NET matches it     →  Frontend matches .NET
(source of truth)               (proxy + auth)          (consumer)

If Python changes later:
  → .NET DTOs must update    →  Angular interfaces   →  Flutter models
  → CoachAIBackendRoutes     →  Service methods       →  Repository methods
```

The agent builds bottom-up so each layer's contract is FIXED before the next layer starts. No guessing, no mismatches.

#### 3.5 Write Tests

Every approach must include tests across ALL affected layers:

**Python:**
```bash
cd degreed-coach-builder && make test
# Or specific test file:
python -m pytest backend/tests/test_{feature}.py -v
```

**C#:**
```bash
cd Degreed/trunk && ./dg.ps1 t
```

**Angular:**
```bash
cd fe-workspace && nx affected -t test
```

**Flutter:**
```bash
cd degreed-flutter && flutter test
```

#### 3.6 Security & Accessibility Checklist

Before creating PRs, verify:

**Security:**
- [ ] No SQL/command/XSS injection vulnerabilities
- [ ] Auth/access checks at system boundaries
- [ ] PII not leaked in logs
- [ ] Guardrail precedence: System > Platform > User
- [ ] No hardcoded secrets or credentials
- [ ] Input validation at API boundaries

**Accessibility (WCAG 2.2 AA) — if frontend changes:**
- [ ] Icon-only buttons have accessible names (tw-sr-only or aria-label)
- [ ] Disabled buttons use `aria-disabled`, not native `disabled`
- [ ] Modals trap focus and restore on close
- [ ] Dynamic content uses `aria-live` regions
- [ ] Form errors use `aria-invalid` + `aria-describedby`
- [ ] All interactive elements keyboard accessible
- [ ] Visible focus indicators on all focusable elements
- [ ] Color is not the only indicator of state

Consider running `mcp__pal__secaudit` for automated security review.

#### 3.7 Create Pull Request

In each affected repo, push and create PR:

```bash
git push -u origin feature/{epic-id}-approach-{x}-{name}

gh pr create --title "feat: {description} (Approach {A|B|C} for {EPIC-ID})" --body "$(cat <<'EOF'
## Summary
Implementation of **Approach {A|B|C}: {Approach Name}** for {EPIC-ID}: {Epic Title}

**Jira Epic:** https://degreedjira.atlassian.net/browse/{EPIC-ID}
**ADR:** docs/architecture/{id}-{feature}.md
**Research:** docs/plans/{id}-{feature}-research.md

## Approach Description
{2-3 sentences describing this approach}

## Changes
- {file1}: {what changed and why}
- {file2}: {what changed and why}

## Trade-offs
- **Pros:** {from ADR}
- **Cons:** {from ADR}

## Test Plan
- [ ] Unit tests pass (`make test` / `./dg.ps1 t` / `nx affected -t test`)
- [ ] {feature-specific verification steps}
- [ ] Security checklist verified
- [ ] No breaking changes to existing API contracts

## Comparison
This is one of 3 approaches. See also:
- Approach {other1}: {PR link if available}
- Approach {other2}: {PR link if available}
EOF
)"
```

Record the PR URL from the output.

#### 3.8 Update Jira Sub-Task (with Agent Identity)

Each agent posts completion on its approach sub-task via `mcp__atlassian__addCommentToJiraIssue`:

```
[Agent Maestro-{Alpha|Beta|Gamma}] Implementation complete for Approach {A|B|C}: {Name}

PR(s):
- degreed-coach-builder: {PR URL}
- Degreed: {PR URL}
- fe-workspace: {PR URL}
- degreed-flutter: {PR URL}

Branch: feature/{epic-id}-approach-{x}-{name}

Layers implemented:
- Python (FastAPI): {summary}
- .NET (Controllers/Orchestrators): {summary}
- Angular (Components/Services): {summary}
- Flutter (Cubits/UI): {summary}

Tests: {pass/fail per repo}
```

Transition the sub-task to "In Review" via `mcp__atlassian__transitionJiraIssue`.

### 4. Collect Agent Results

After all 3 agents complete (they run in parallel), collect their outputs:
- PR URLs from each agent
- Test results from each agent
- Any issues or blockers flagged

### 5. Cross-Reference PRs

After all 3 PRs are created, update each PR body to include links to the other two. Use `gh pr edit` to add the cross-references.

### 6. Present Summary

Display all 3 approaches with their PR links:

```
## Implementation Complete — 3 Approaches

### Approach A: {Name}
- PR: {link}
- Repos: {list}
- Complexity: {Low/Medium/High}

### Approach B: {Name}
- PR: {link}
- Repos: {list}
- Complexity: {Low/Medium/High}

### Approach C: {Name}
- PR: {link}
- Repos: {list}
- Complexity: {Low/Medium/High}

### Quick Comparison
| Criteria | A | B | C |
|----------|---|---|---|
| Complexity | ... | ... | ... |
| Performance | ... | ... | ... |
| Maintainability | ... | ... | ... |
| Risk | ... | ... | ... |
```

## Variations

### Single Approach (Bug Fix Mode)
If the Epic is a bug fix or the user chose a single approach:
- Skip the multi-branch pattern
- Create one branch: `fix/{epic-id}-{short-name}` or `feature/{epic-id}-{short-name}`
- Create one PR
- Still update the Jira sub-task

### Lightweight Approaches
If the user says "implement B fully, sketch A and C":
- Full implementation for the primary approach
- For sketches: create the branch with key structural changes + TODO comments for details
- PRs for sketches should be marked as Draft: `gh pr create --draft`

### Multi-Repo Approach
If an approach spans multiple repos:
- Create branches in all affected repos with the same naming pattern
- Create PRs in each repo, cross-linking them
- Note the deployment order (usually: database → .NET → Python → frontend)

---

## Worktree Lifecycle

### After Implementation — Cleanup

Once all branches are pushed and PRs are created, **clean up worktrees** to avoid cluttering the workspace:

```bash
# For each repo that had a worktree
cd degreed-coach-builder && git worktree remove ../worktrees/approach-a/degreed-coach-builder
cd degreed-coach-builder && git worktree remove ../worktrees/approach-b/degreed-coach-builder
cd degreed-coach-builder && git worktree remove ../worktrees/approach-c/degreed-coach-builder

# Repeat for Degreed, fe-workspace, degreed-flutter

# Remove the worktree directory structure
rm -rf worktrees/
```

The branches still exist on the remote (they were pushed). The PRs are open. Only the local worktree copies are removed.

### Resuming Work Later

To work on an approach again (e.g., fix review feedback, extend the implementation):

```bash
# Recreate worktree from the remote branch
mkdir -p worktrees/approach-a
cd degreed-coach-builder && git worktree add ../worktrees/approach-a/degreed-coach-builder feature/{epic-id}-approach-a-{name}
cd ../Degreed && git worktree add ../worktrees/approach-a/Degreed feature/{epic-id}-approach-a-{name}
# ... repeat for other repos

# Now point the agent at the worktree path
Agent({
  description: "Maestro-Alpha: Continue work on Approach A",
  model: "opus",
  prompt: "... work in worktrees/approach-a/ ..."
})
```

### Cleanup After Approach Selection (Step 9)

When the user selects an approach, the orchestrator's Step 9 handles full cleanup:
1. Close rejected PRs across all repos
2. Delete rejected remote branches
3. Remove any remaining worktrees
4. Transition rejected Jira sub-tasks to Closed
