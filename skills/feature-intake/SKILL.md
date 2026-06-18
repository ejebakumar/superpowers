---
name: feature-intake
description: "Use when starting the feature builder pipeline, or when the user wants to analyze or understand a Jira Epic before implementation."
---

# Feature Intake — Jira Epic Analysis

Fetch a Jira Epic, follow all linked resources, extract requirements, and set up the pipeline sub-tasks.

## Compose These Disciplines

This runbook executes on the superpowers engine — invoke these skills, don't reimplement them:

- `superpowers:brainstorming` — when the Epic is ambiguous or scope is unclear, resolve it with the user BEFORE extracting requirements or creating sub-tasks.

## Intake Mode Selection

Phase 0 has two intake modes — declare which you're using in tracker §0 BEFORE doing anything else.

- **Greenfield**: triggered by user phrases like "start fresh", "from scratch", "ignore past work", "rebuild this". Conductor MUST `mv` matching prior assets to dated archive directories (`.claude/skills/_archive/{YYYY-MM-DD}/`, `tools/_archive/{YYYY-MM-DD}/`, `docs/_archive/{YYYY-MM-DD}/`) BEFORE Phase 1 begins. Reference the archive paths in the tracker.
- **Continuation** (default): acknowledge prior assets explicitly and state whether the new plan extends or replaces each one. Never silently overwrite.

See `.claude/rules/feature-pipeline.md` § Greenfield vs Continuation Intake Modes for the full rule.

## Environment Readiness Check

Phase 0 starts with a hard pre-flight smoke test. ANY failure is a Phase 0 BLOCKER (not advisory). Document the result in tracker §0 (one line per check).

Required checks:
- `/mcp` — confirm all configured MCP servers are connected (atlassian, codex, datadog, figma, livekit-docs, pal, playwright, etc.)
- `dotnet --version` — .NET 8 SDK present
- `python3 --version` — Python 3.12+ present
- `gh --version` && `gh auth status` — GitHub CLI present and authenticated
- `mcp__pal__listmodels` — PAL MCP responsive

If any check fails, surface it to the user immediately and STOP — do not advance to Phase 1.

## User Directive Conflict Detection

When the user issues a verbatim directive that the codebase contradicts, surface the conflict as a **blocking checkpoint** — never auto-resolve by silently deriving a new requirement.

Checklist for every requirement extracted in intake:
1. Quote the user's directive verbatim.
2. Search the codebase for evidence (file:line, schema, migration, commit).
3. If the directive matches the codebase → proceed.
4. If the directive contradicts the codebase → STOP and ask:
   > "You said: '{verbatim quote}'. Codebase shows: {evidence}. Confirm: (a) override codebase and proceed with directive, or (b) accept codebase finding and amend directive."
5. Log the conflict and the user's resolution in the tracker's Decision Log.

Do NOT proceed past the conflict checkpoint until the user picks (a) or (b).

## Constants

```
JIRA_CLOUD_ID = "151636d7-9099-4803-a108-4f053f36c9fe"
```

## Instructions

### 1. Fetch the Epic

Use `mcp__atlassian__getJiraIssue`:
- `cloudId`: `151636d7-9099-4803-a108-4f053f36c9fe`
- `issueIdOrKey`: the Epic ID (e.g., `PD-1234`)

Extract from the response:
- `summary` — Epic title
- `description` — Full description (may contain Atlassian Document Format)
- `status` — Current status
- `priority` — Priority level
- `assignee` — Who owns it
- `labels` — Categorization
- `issuelinks` — Linked issues (blockers, relates-to, etc.)
- `subtasks` — Existing sub-tasks
- `comment.comments` — All comments

### 2. Follow All Links

**Linked Jira Issues:**
For each issue in `issuelinks`, fetch it via `getJiraIssue`. Record:
- Ticket ID, summary, status
- Relationship type (blocks, is blocked by, relates to)
- Key details from description

**Confluence Pages:**
Scan the description and ALL comments for Confluence URLs matching:
- `https://degreedjira.atlassian.net/wiki/*`
- `https://*.atlassian.net/wiki/spaces/*/pages/*`

For each Confluence URL, extract the page ID and fetch via `mcp__atlassian__getConfluencePage`:
- `cloudId`: `151636d7-9099-4803-a108-4f053f36c9fe`
- `pageId`: extracted from URL

Record the page title and body content.

**External URLs:**
Scan for other URLs (Figma, Google Docs, design specs). Fetch accessible ones via `WebFetch`. Note inaccessible ones for the user.

**Remote Links:**
Use `mcp__atlassian__getJiraIssueRemoteIssueLinks` to find GitHub PRs, external links attached to the ticket.

### 3. Read All Comments

Comments often contain the real context. For each comment:
- Extract the author and date
- Look for requirements, decisions, clarifications
- Look for linked resources
- Note any questions or unresolved discussions

### 4. Extract Requirements

Synthesize everything into a structured format:

```markdown
## Requirements

### Functional Requirements
1. [FR-1] {requirement} — Source: {ticket description / comment / confluence page}
2. [FR-2] ...

### Non-Functional Requirements
1. [NFR-1] {performance / security / accessibility requirement}

### Acceptance Criteria
1. [AC-1] {criterion}

### Affected Systems
- [ ] degreed-coach-builder (Python Maestro)
- [ ] Degreed (.NET backend)
- [ ] fe-workspace (Angular frontend)
- [ ] degreed-flutter (Mobile)
- [ ] degreed-assistant (DGA)

### Constraints
- {constraint 1}

### Dependencies
- {dependency 1}

### Open Questions
- {question 1} — needs answer from {stakeholder}
```

### 4.1 UI & Design Discovery

**If the feature involves ANY user-facing changes** (frontend, mobile, or even admin UI), run this discovery:

#### Check for Design Assets

1. **Search for Figma links** in the ticket description, comments, and linked Confluence pages
2. **Ask the user directly:**
   > This feature involves UI changes. Do you have any of these?
   > - Figma design URL
   > - Screenshots or mockups
   > - Reference to an existing page/component to match
   > - "No design — I'll describe what I want"

#### If Figma URL Exists

**Using the Figma MCP is MANDATORY when a URL is provided** — never WebFetch a Figma URL when the MCP is available; you'll lose all the structural design context.

**Required prerequisite skills (load BEFORE any tool call):**
- `figma:figma-use` — required before any `mcp__plugin_figma_figma__*` write call
- `figma:figma-implement-design` — required before translating designs into code

**Parse the URL** to extract `fileKey` and `nodeId`:
- `figma.com/design/{fileKey}/{fileName}?node-id={int1}-{int2}` → use `fileKey` directly, convert nodeId hyphen to colon (`1-2` → `1:2`)
- `figma.com/design/{fileKey}/branch/{branchKey}/{fileName}` → use `branchKey` as the `fileKey`
- `figma.com/make/{makeFileKey}/{makeFileName}` → use `makeFileKey`

**Tool call sequence (run in parallel where possible):**
```
mcp__plugin_figma_figma__get_design_context({fileKey, nodeId})  # primary tool — returns code + screenshot + tokens + Code Connect map
mcp__plugin_figma_figma__get_screenshot({fileKey, nodeId})      # canonical visual reference
mcp__plugin_figma_figma__get_variable_defs({fileKey, nodeId})   # design tokens (colors, spacing, typography)
mcp__plugin_figma_figma__get_code_connect_map({fileKey, nodeId})# component → code mappings (if present, REUSE mapped Apollo components instead of generating from scratch)
mcp__plugin_figma_figma__get_metadata({fileKey, nodeId})        # node hierarchy + names
```

**Extract and save artifacts:**
- Layout, components, spacing, colors, typography, responsive behavior
- Save the screenshot, tokens JSON, and component map to `docs/builds/{EPIC-ID}-design/`
- Reference them from the build tracker (Design Assets section)

**Map Figma components to Apollo/Fresco design system equivalents.** If Code Connect mappings exist, the mapped components are the source of truth — use them directly.

**If Figma MCP is NOT available** (rare — only if the plugin was disabled), fall back to `WebFetch` on the Figma URL for accessible metadata only, and ask the user to share screenshots.

#### If NO Design Exists

**Don't proceed blind. Generate a visual preview for the user to approve.**

**ALWAYS load the `degreed-design-system` skill first** — it has the brand colors, typography, UI kit components, and assets needed to build accurate mockups.

1. **Generate an HTML mockup** using the design system skill:
   - Load `degreed-design-system` to get Apollo/Fresco components, brand colors (`#0062E3` True Blue, `#0F1F2C` Moon Shot, `#FF7F64` Fry Sauce), typography (Inter), and icons
   - Use UI kit components from `ui_kits/web/` (Apollo) or `ui_kits/flutter/` for mobile
   - Pick the right visual system: **Apollo** for marketing/auth/onboarding surfaces, **Fresco** for in-product surfaces
   - Create a static HTML file the user can preview
   - Show it to the user at the checkpoint

2. **Describe the UI in structured text:**
   ```markdown
   ## Proposed UI Layout

   ### {Page/Component Name}
   **Location:** {where in the app — route, tab, section}
   **Surface:** {Learner / Studio / Both}

   **Layout:**
   ┌─────────────────────────────────┐
   │  Header: {title}                │
   │  ┌───────────┐  ┌───────────┐  │
   │  │  Toggle:   │  │  Status:  │  │
   │  │  [ON/OFF]  │  │  {text}   │  │
   │  └───────────┘  └───────────┘  │
   │                                 │
   │  {Content area description}     │
   │                                 │
   │  [Action Button]                │
   └─────────────────────────────────┘

   **Interactions:**
   - Toggle → enables/disables {feature}
   - Button → triggers {action}

   **States:**
   - Default: {what user sees initially}
   - Loading: {spinner/skeleton}
   - Error: {error message pattern}
   - Empty: {empty state — use Apollo EmptyState}

   **Apollo Components to Use:**
   - apo-toggle for the toggle
   - apo-button (primary) for the action
   - apo-alert for error states
   ```

3. **Present to user at checkpoint:**
   > Here's my proposed UI layout. Does this match what you're envisioning?
   > - "looks right" → proceed with this as the target
   > - "change {X}" → I'll update the mockup
   > - "here's a screenshot of what I want" → I'll match that instead
   > - "let me share the Figma" → I'll wait for the URL

#### Classify the UI Scope

```markdown
### UI Scope
| Surface | Component | New/Modified | Apollo Available? |
|---------|-----------|-------------|------------------|
| Studio | KB tab toggle | New | apo-toggle ✓ |
| Learner | Coach chat | Modified | existing components |
| Mobile | Coach screen | Modified | Flutter equivalent |

### Design Status
- [ ] Figma design: {URL / not available}
- [ ] Mockup approved by user: {yes/no/pending}
- [ ] Apollo components verified: {list}
```

### 5. Post Planning Comment

Use `mcp__atlassian__addCommentToJiraIssue` to post on the Epic:

```
cloudId: "151636d7-9099-4803-a108-4f053f36c9fe"
issueIdOrKey: "{EPIC-ID}"
```

Comment body (use Atlassian Document Format — paragraph nodes):
```
AI Feature Builder — Planning Summary

Requirements Understood:
1. {requirement 1}
2. {requirement 2}
...

Affected Systems: {repo list}
Dependencies: {list}
Open Questions: {list, if any}

Pipeline Status: Intake complete. Proceeding to deep research.
Phases: Deep Research > Architecture Decision > 3 Implementation Approaches > Confluence Doc > Test Skill
```

### 6. Create Confluence Wiki Folder

**Every pipeline run gets its own Confluence folder** so all docs are accessible in the cloud, linkable from Jira/PRs, and shared with the team.

#### 6.1 Create Parent Page

Create a parent page under the pipeline space:

```
mcp__atlassian__createConfluencePage(
  cloudId: "151636d7-9099-4803-a108-4f053f36c9fe",
  spaceId: "5895915199",
  title: "{EPIC-ID} — {Feature Name}",
  contentFormat: "markdown",
  body: "# {EPIC-ID} — {Feature Name}\n\nPipeline documents for this feature.\n\n| Document | Status |\n|----------|--------|\n| Research | Pending |\n| ADR | Pending |\n| SDD | Pending |\n| Build Tracker | Pending |"
)
```

Record the parent page ID. All subsequent documents are created as **child pages** under this parent.

#### 6.2 Local + Cloud Sync Strategy

Every document exists in TWO places:
- **Local:** `docs/builds/`, `docs/plans/`, `docs/architecture/` — for git history and offline access
- **Cloud:** Confluence child pages under the feature folder — for team access and linking

**When a local doc is written or updated**, also create/update its Confluence counterpart:

| Local Path | Confluence Child Page Title |
|-----------|---------------------------|
| `docs/builds/{EPIC-ID}-{name}.md` | `Build Tracker — {EPIC-ID}` |
| `docs/plans/{id}-research.md` | `Deep Research — {EPIC-ID}` |
| `docs/architecture/{id}.md` | `Architecture Decision — {EPIC-ID}` |

**After each phase**, sync the updated local doc to its Confluence page:
```
mcp__atlassian__updateConfluencePage(pageId, title, body, contentFormat: "markdown")
```

Store the Confluence page IDs in the build tracker so they can be linked from Jira and PRs.

#### 6.3 Link from Jira and PRs

**On Jira comments and sub-tasks:** Always include the Confluence folder link:
```
Wiki folder: https://degreedjira.atlassian.net/wiki/spaces/~712020a0b63342badc4b25ab05e1dc1cb61a3d/pages/{parent-page-id}
```

**On PR descriptions:** Include links to the relevant Confluence docs:
```
**Docs:**
- [Research](https://degreedjira.atlassian.net/wiki/.../pages/{research-page-id})
- [ADR](https://degreedjira.atlassian.net/wiki/.../pages/{adr-page-id})
- [Build Tracker](https://degreedjira.atlassian.net/wiki/.../pages/{tracker-page-id})
```

---

### 7. Create Jira Sub-Tasks (Requirement-Based)

**DO NOT create a ticket for every pipeline phase.** Phase tracking is handled by the build tracker document. Jira tickets are for ACTUAL WORK — requirements and implementation tasks.

#### 7.1 Ask User Before Creating Tickets

Before creating any tickets, present the proposed tickets and ask:

> I've identified {N} implementation tasks from the requirements. How should we track them?
>
> **Proposed Jira tickets (actual work):**
> 1. `{requirement-based task 1}` — {scope}
> 2. `{requirement-based task 2}` — {scope}
> 3. `{requirement-based task 3}` — {scope}
>
> **Options:**
> - "create all" → Create all as Jira Tasks under the Epic
> - "create [1, 3] only" → Create specific ones, track the rest locally
> - "track locally" → No Jira tickets, track everything in the build tracker doc
> - "also add a spike for [topic]" → Create a Spike ticket for exploratory work

#### 7.2 Types of Tickets to Create

| Type | When to Create | Example |
|------|---------------|---------|
| **Task** | A concrete implementation requirement | "Add CanReferenceTeamData column to aicoach.Coaches" |
| **Story** | A user-facing requirement | "As a manager, I can see my team's skill gaps in coach" |
| **Spike** | Exploratory/investigation work | "Investigate prompt-inject vs tool-call for large teams" |
| **Bug** | Found during testing | "SSE disconnects when team context exceeds 30KB" |

**DO NOT create:**
- `[AI] Deep Research` tickets — that's pipeline overhead, not deliverable work
- `[AI] Architecture Decision` tickets — the ADR doc covers this
- `[AI] Documentation` tickets — the SDD page covers this
- `[AI] Test Skill` tickets — the test tool itself is the deliverable
- `[AI] Code Review` tickets — the review is part of the implementation flow

#### 7.3 How to Create (When Approved)

**Hierarchy rule:** Epic (level 1) → Task/Story (level 0) → Subtask (level -1). When parent is an Epic, create Task type.

**Required fields by project:**

| Project | Type | Required Field | Key | Value |
|---------|------|---------------|-----|-------|
| AIDATASCI | Task | Acceptance Criteria | `customfield_11938` | Auto-generate from requirement |

```
mcp__atlassian__createJiraIssue(
  cloudId: "151636d7-9099-4803-a108-4f053f36c9fe",
  projectKey: "{from Epic}",
  issueTypeName: "Task",
  parent: "{EPIC-ID}",
  summary: "{requirement-based title}",
  description: "{what needs to be done}",
  additionalFields: {
    "customfield_11938": "{acceptance criteria from the requirement}"
  }
)
```

**For Spikes:**
```
issueTypeName: "Spike",
summary: "[Spike] {investigation topic}",
description: "{what to explore and why}"
```

#### 7.4 Local-Only Tracking

If the user chooses "track locally", all work is tracked in the build tracker doc. The build tracker gets a new section:

```markdown
## Work Items (Local Tracking)
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Add CanReferenceTeamData to DB | Done | In Approach A PR |
| 2 | Build TeamContext DTO | Done | In Approach A PR |
| 3 | Wire into CoachOrchestrator | In Progress | Blocked on Python endpoint |
```

This section is synced to the Confluence build tracker page so it's visible to the team even without Jira tickets.

#### 7.5 Adding Tickets Later

At any checkpoint, the user can say:
- "create a ticket for {item}" → Create a single Jira Task
- "create a bug for {finding}" → Create a Bug ticket
- "add a spike for {question}" → Create a Spike ticket

The pipeline accommodates this at any point — ticket creation is not locked to Phase 0.

### 7. Present to User

Display the intake summary:

```
## Intake Complete for {EPIC-ID}: {Epic Title}

### Requirements ({count})
{numbered list}

### Affected Systems
{checkbox list}

### Linked Resources
- Jira: {linked ticket list}
- Confluence: {page list}
- External: {URL list}

### Sub-Tasks Created
{list of 7 sub-tasks with IDs}

### Open Questions
{list, if any}
```

Ask: "Should I proceed with deep research, or do you want to adjust the requirements?"

## Edge Cases

- **Epic has no description:** Flag this to the user, ask for requirements.
- **Confluence page is restricted:** Note it as inaccessible, ask user to share content.
- **Epic already has sub-tasks:** List existing sub-tasks, ask if AI sub-tasks should be added alongside.
- **Epic is actually a Story/Task (not an Epic):** Proceed anyway but note the issue type. Skip sub-task creation if inappropriate, create linked tasks instead.
