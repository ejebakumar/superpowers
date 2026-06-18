---
name: feature-review
description: Use when implementation is complete and you're reviewing the code or PRs before documentation — checking cross-project dependency impact, per-repo standards, Apollo/i18n/a11y compliance, migration safety, and deployed visual fidelity
---

# Feature Review — Post-Implementation Validation

Review all implementation code for quality, standards compliance, dependency safety, component availability, and **deployed visual + a11y fidelity** before creating documentation and finalizing PRs.

## When to Use

- After Phase 3 (Implementation) completes, before Phase 4 (Documentation)
- When the user asks to "review the implementation", "check the code quality", or "validate the PRs"
- After any code change that touches existing modules across projects

## Compose These Disciplines

This skill is the Degreed **rubric** (what to check). The review *discipline* comes from superpowers — invoke these, don't reinvent them:

- **`superpowers:receiving-code-review`** — the systematic loop for running a review and acting on findings. This rubric feeds it.
- **`superpowers:plan-adherence`** — the Phase 3.5 plan-vs-code gate. Any file/API/DTO change not in the plan is undocumented drift → BLOCKED. This is the adherence baseline below.
- **`superpowers:multi-model-validation`** — **mandatory before any BLOCKED verdict.** Confirm the blocker with an independent model (or a runnable proof) so you never block on a single model's opinion.
- **`a11y-review`** (domain) — the WCAG 2.2 AA patterns referenced in §6.

## Visual & A11y Review — Required for FE Changes

For any approach with `fe-workspace` changes, the review MUST include live evidence captured via the Playwright MCP (verify exact namespace via `ToolSearch` on first call; likely `mcp__playwright__*`) AND visual comparison against Figma when a design source exists.

### Procedure (run alongside the static code review)

1. **If Phase 6 (Deploy) hasn't run yet for this approach**, deploy now to a PR env so the live URL is available. Otherwise read the URL from the build tracker.
2. **Capture visual evidence** of every modified route:
   ```
   browser_navigate({url: "{pr-env-url}/{route}"})
   browser_console_messages()                       # zero errors required
   browser_take_screenshot({path: "docs/builds/{EPIC-ID}-evidence/review-{route}.png", fullPage: true})
   ```
3. **Run axe-core on each modified route** for WCAG 2.2 AA:
   ```
   browser_evaluate({ function: "async () => { const {default: axe} = await import('https://cdn.jsdelivr.net/npm/axe-core@4/+esm'); return await axe.run(document, {runOnly: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}); }" })
   ```
   Save violations JSON to `docs/builds/{EPIC-ID}-evidence/axe-{route}.json`.
4. **Visual comparison vs Figma** (only when `docs/builds/{EPIC-ID}-design/figma-screenshot.png` exists):
   - Re-fetch Figma reference: `mcp__plugin_figma_figma__get_screenshot({fileKey, nodeId})`
   - Compare against the Playwright screenshot from step 2
   - Flag pixel diffs > 5%, missing states, wrong spacing/colors

### Verdict Rules

- **Console errors on a deployed page** → BLOCKER (must fix before merge)
- **Any axe WCAG 2.2 AA violation** → BLOCKER unless explicitly waived by accessibility owner
- **Visual diff > 5% with no design rationale** → WARNING (post for design review, don't block)
- **Apollo gap discovered (custom CSS where Apollo would do)** → post a Jira comment, don't block
- **Captured screenshots posted as PR review comments** so reviewers see exactly what was deployed

### Evidence Posting

Post a single PR review comment per route with:
```markdown
**Visual Review — {route}**
- Screenshot: ![{route}]({path-to-screenshot})
- Console errors: {count}
- Axe violations (WCAG 2.2 AA): {count} — see axe-{route}.json
- Figma diff: {pct}% (baseline: {baseline-path})
```

## Constants

```
JIRA_CLOUD_ID = "151636d7-9099-4803-a108-4f053f36c9fe"
```

---

## Instructions

### 1. Cross-Project Dependency Validation

This is the most critical check. When existing modules are modified (not new code), verify that changes don't break consumers in other projects.

#### 1.1 Classify Changes

For each modified file, classify it:

| Classification | Description | Validation Required |
|---------------|-------------|-------------------|
| **New module** | Brand new file, no existing consumers | None — safe by default |
| **Existing internal** | Modified file, consumers only within same project | Intra-project validation |
| **Existing cross-project** | Modified file, consumed by other projects | **Full cross-project validation** |
| **API contract** | Changed endpoint signature, request/response shape | **Critical — all consumers must be checked** |
| **Database schema** | Changed table, SP, or migration | **Critical — all layers must be checked** |

#### 1.2 Trace Cross-Project Dependencies

For each "existing cross-project" or "API contract" change, trace the full dependency chain:

**Python endpoint changes → .NET consumers:**
```
# Find the route in .NET
Grep for the endpoint path in:
  - Degreed/trunk/Degreed.Common.Standard/Constants/CoachAIBackendRoutes.cs
  - Degreed/trunk/Degreed.Common.Standard/Orchestrators/

# If the request/response shape changed:
  - Check the .NET DTO classes match the new Python model
  - Check the orchestrator correctly maps fields
  - Check the controller correctly forwards/transforms
```

**.NET controller changes → Frontend consumers:**
```
# Find Angular service calls
Grep for the endpoint path in:
  - fe-workspace/apps/lxp/src/app/**/services/
  - fe-workspace/apps/lxp/src/app/**/facades/

# Find Flutter service calls
Grep for the endpoint path in:
  - degreed-flutter/lib/**/services/
  - degreed-flutter/lib/**/repositories/

# If the response shape changed:
  - Check TypeScript interfaces match new shape
  - Check Dart models match new shape
  - Check component templates handle new/removed fields
```

**.NET domain model changes → Database:**
```
# If entity changed:
  - Check SQL table definition in Degreed/trunk/Degreed.SqlDb/aicoach/
  - Check stored procedures that reference the table
  - Check if a migration is needed
```

**Redis session model changes → All consumers:**
```
# SessionDataModel changes affect both Python and .NET
Grep for the field name in:
  - degreed-coach-builder/backend/app/db/redis_manager.py
  - Degreed/trunk/ (Redis cache references)
```

#### 1.3 Produce Dependency Validation Report

```markdown
## Dependency Validation Report

### Modified Existing Modules
| File | Classification | Consumers | Validated |
|------|---------------|-----------|-----------|
| `backend/app/api/sse/router.py` | Cross-project API | .NET CoachOrchestrator, Angular CoachApiService | Yes/No |

### Breaking Changes Detected
| Change | Affected Consumer | Impact | Fix Required |
|--------|------------------|--------|-------------|

### Safe Changes (New Code)
| File | Reason |
|------|--------|
| `backend/app/api/new_feature/router.py` | New module, no existing consumers |
```

---

### 2. Code Quality Review Per Repo

Run a systematic review for each affected repo. Use `mcp__pal__codereview` for automated analysis, then verify manually.

#### 2.1 Degreed (.NET) — Standards Compliance

**Version Check:**
```bash
# Check the target framework version
grep -r "TargetFramework" Degreed/trunk/Directory.Build.props
grep -r "TargetFramework" Degreed/Degreed.Foundation/Directory.Build.props
# Current: .NET 8 for modern, .NET Standard 2.0 for shared, .NET Framework 4.7.2 for legacy
```

**Coding Standards Checklist:**
- [ ] **C# version compliance** — C# 11 for trunk, C# 12 for Foundation/services
- [ ] **Async all the way** — No `.Result` or `.Wait()` on tasks
- [ ] **Guard clauses** over deep nesting
- [ ] **SOLID principles** — Single responsibility, dependency injection
- [ ] **Pattern compliance** — Controller → Orchestrator → Service pattern
- [ ] **Null safety** — Null-coalescing operators, pattern matching, no bare null checks
- [ ] **Modern syntax** — Expression-bodied members, switch expressions, LINQ over manual loops
- [ ] **Immutability** — Readonly fields, records for DTOs where appropriate
- [ ] **Logging** — Uses `Microsoft.Extensions.Logging`, no sensitive data logged
- [ ] **Parameterized queries** — No raw SQL string concatenation
- [ ] **Error handling** — Appropriate try/catch at boundaries, not wrapping everything
- [ ] **Auth decorators** — `ValidateCoachAccessAttribute` on new Maestro endpoints

**Run:**
```bash
cd Degreed/trunk && ./dg.ps1 build  # Verify clean build
cd Degreed/trunk && ./dg.ps1 t      # Verify tests pass
```

#### 2.2 fe-workspace (Angular) — Standards Compliance

**Version Check:**
```bash
# Check Angular version
cat fe-workspace/package.json | grep "@angular/core"
# Current: Angular 20
# Check Node version
cat fe-workspace/.nvmrc 2>/dev/null || cat fe-workspace/package.json | grep "engines"
```

**Coding Standards Checklist:**
- [ ] **Angular Signals** used for state management (not legacy RxJS subjects where Signals work)
- [ ] **Facade pattern** for complex state management
- [ ] **NgxHttpClient** with auto `/api` prefix (not raw HttpClient)
- [ ] **Lazy-loaded routes** with appropriate guards
- [ ] **Standalone components** (Angular 20 default)
- [ ] **TypeScript strict mode** compliance
- [ ] **No `any` types** unless absolutely necessary
- [ ] **Proper unsubscription** — takeUntilDestroyed, DestroyRef, or async pipe
- [ ] **Accessibility** — ARIA labels, keyboard navigation, semantic HTML

**Apollo Component Check (CRITICAL):**
```bash
# List available Apollo components
ls fe-workspace/libs/apollo/*/src/ 2>/dev/null
# Or search the docs
ls fe-workspace/apps/lxp-docs/src/app/docs/apollo/
```

For each UI component used in the implementation:
1. Check if an Apollo equivalent exists in `libs/apollo/`
2. Check the Apollo docs at `apps/lxp-docs/src/app/docs/apollo/`
3. If no Apollo component exists and one is needed:
   - **Post a Jira comment** flagging the missing component:
     ```
     [Agent {name}] Apollo Component Gap Identified

     The implementation requires a {component type} component (e.g., {description}).
     No matching Apollo component was found in libs/apollo/.

     Current workaround: {what was used instead — Fresco, custom, third-party}
     Recommendation: Create an Apollo {component} component for design system consistency.

     Affected files: {list}
     ```
4. If a Fresco component was used instead of an available Apollo component:
   - Flag it for migration: "This should use Apollo {X} instead of Fresco {Y}"

**Available Apollo Components (common ones):**
- Buttons (primary, secondary, tertiary, destructive)
- Drawer, Confirm (dialog), Toast
- Dropdown, Combobox, Select List
- Search Field, Text Field, Textarea
- Checkbox, Radio, Toggle
- Avatar, Breadcrumb, Pagination
- Empty State, Alert, Filter
- Icons, Headers, Dynamic Header, Skip Nav
- Datepicker, Tabs, Tooltip

**Run:**
```bash
cd fe-workspace && nx affected -t test
cd fe-workspace && nx affected -t lint
```

#### 2.3 degreed-coach-builder (Python) — Standards Compliance

**Version Check:**
```bash
python3 --version  # Should be 3.12+
cat degreed-coach-builder/pyproject.toml | grep python
```

**Coding Standards Checklist:**
- [ ] **Full async/await** — No blocking calls in async context
- [ ] **Type annotations** on all public function signatures
- [ ] **Strategy pattern** compliance for prompts (PromptStrategyFactory)
- [ ] **DegreedApiService** used for .NET callbacks (not raw HTTP)
- [ ] **EndpointRegistry** for route definitions
- [ ] **SessionDataModel** for session state (not raw Redis)
- [ ] **PII masking** in logs (uses `masking_user_data.py`)
- [ ] **Structured JSON logging** (not print statements)
- [ ] **Error handling** — Appropriate FastAPI HTTPExceptions
- [ ] **Security validation** — Auth checks via `security_validation.py`

**Run:**
```bash
cd degreed-coach-builder && make test
```

#### 2.4 degreed-flutter — Standards Compliance

**Version Check:**
```bash
flutter --version  # Should be 3.35+
cat degreed-flutter/pubspec.yaml | grep "sdk:"
```

**Coding Standards Checklist:**
- [ ] **DegreedCubit<State>** used (NOT standard Cubit/Bloc)
- [ ] **safeEmit()** used (NOT emit())
- [ ] **Freezed** for immutable state classes with copyWith
- [ ] **GetIt DI** — services registered in `service_locator.dart`
- [ ] **Flat module structure** (NOT Clean Architecture layers)
- [ ] **Dio interceptors** for auth headers
- [ ] **flutter_client_sse** for SSE streaming
- [ ] **No BuildContext across async gaps**

**Run:**
```bash
cd degreed-flutter && flutter test
cd degreed-flutter && flutter analyze
```

#### 2.5 degreed-assistant (Python DGA) — Standards Compliance

**Only if DGA code was modified:**
- [ ] **LangChain patterns** — Chains, Tools, Memory
- [ ] **AgentUtils** class for tool methods
- [ ] **Per-scope prompt templates**
- [ ] **Redis-backed ConversationBufferMemory**

---

### 3. Automated PAL Code Review (Run FIRST)

Before the manual checklist, run automated deep review on each approach's diff.

**For each approach:**

1. **Get the diff:**
   ```bash
   gh pr diff {pr-number} --repo {owner}/{repo}
   ```

2. **Run `mcp__pal__codereview`** with:
   - The diff content
   - `review_type: "full"` for comprehensive review
   - Focus on: correctness, maintainability, performance, security
   - Include repo-specific standards context (inline the key conventions)

3. **Run `mcp__pal__secaudit`** separately for security-focused review

4. **Post findings as a GitHub PR comment** (not just Jira — developers see this in the PR):
   ```bash
   gh pr comment {pr-number} --body "$(cat <<'EOF'
   ## [Agent Maestro-Review] Automated Code Review

   ### Findings
   {PAL codereview output — organized by severity}

   ### Security
   {PAL secaudit output}

   ### Verdict: {PASS / PASS WITH NOTES / NEEDS CHANGES}
   EOF
   )"
   ```

5. Synthesize PAL findings into the review report alongside manual checklist results.

This creates a **visible audit trail on GitHub**, not just in Jira. Every PR has a review comment from the agent.

---

### 4. Approach Diff Comparison

Generate a quantitative comparison of the 3 approaches showing exactly where they diverge.

**For each repo that all 3 approaches touch:**
```bash
# Compare A vs B
git diff feature/{epic}-approach-a-{name}..feature/{epic}-approach-b-{name} -- {path} | wc -l

# Compare A vs C
git diff feature/{epic}-approach-a-{name}..feature/{epic}-approach-c-{name} -- {path} | wc -l
```

**Produce a comparison table:**
```markdown
| Dimension        | Approach A          | Approach B          | Approach C          |
|------------------|---------------------|---------------------|---------------------|
| New files         | 4                   | 6                   | 3                   |
| Modified files    | 7                   | 5                   | 8                   |
| Lines added       | 340                 | 520                 | 290                 |
| Lines removed     | 12                  | 45                  | 8                   |
| New tests         | 6                   | 4                   | 8                   |
| Key pattern       | Strategy extension  | Middleware hook     | Event-driven        |
| Structural diff   | {same/different}    | {same/different}    | {same/different}    |
```

**Categorize divergence type:**
- **Structural**: Different file organization or module decomposition
- **Pattern**: Different design patterns (strategy vs middleware vs event-driven)
- **Surface**: Same structure, different implementation details

Include this table in the review report and the Confluence documentation.

---

### 5. i18n Translation Compliance Check (Frontend Changes)

**When fe-workspace or degreed-flutter changes exist**, verify all user-facing strings are translated.

**Angular (fe-workspace) — detect hardcoded strings:**
```bash
# Search for hardcoded strings in templates (should use translate() instead)
grep -rn ">[A-Z][a-z].*</" fe-workspace/apps/lxp/src/app/{affected-paths} --include="*.html" | grep -v "translate\|i18n\|aria-"

# Search for hardcoded strings in TypeScript toasts/alerts
grep -rn "'[A-Z][a-z].*'" fe-workspace/apps/lxp/src/app/{affected-paths} --include="*.ts" | grep -v "translate\|\.spec\.\|test\."
```

**Flutter — detect hardcoded strings:**
```bash
# Search for hardcoded Text() widgets
grep -rn "Text('[A-Z]" degreed-flutter/lib/{affected-paths} --include="*.dart" | grep -v "intl\|test\|_test"
```

**Report:**
```markdown
### i18n Compliance
| File | Line | Hardcoded String | Fix |
|------|------|-----------------|-----|
| {file} | {line} | "{string}" | Use `translate('{string}', '{Key}')` |
```

---

### 6. Accessibility Audit (Frontend Changes)

**When fe-workspace or degreed-flutter changes exist**, run WCAG 2.2 AA checks.

Reference the `a11y-review` skill and `shared/a11y-patterns.md` for comprehensive patterns.

**Angular (fe-workspace) checks:**
- [ ] All interactive elements have ARIA labels or `aria-labelledby`
- [ ] Form inputs have associated `<label>` elements
- [ ] Color contrast meets AA ratio (4.5:1 for normal text, 3:1 for large text)
- [ ] Keyboard navigation works (Tab order, Enter/Space activation, Escape to close)
- [ ] Focus management on route changes and modal opens
- [ ] Images have meaningful `alt` text (or `alt=""` for decorative)
- [ ] Error messages are programmatically associated with inputs (`aria-describedby`)
- [ ] Apollo components used correctly (they have built-in a11y — verify not overridden)

**Flutter (degreed-flutter) checks:**
- [ ] `Semantics` widgets used for screen reader labels
- [ ] `ExcludeSemantics` not overused (hiding content from assistive tech)
- [ ] Touch targets meet minimum 48x48dp
- [ ] Color alone not used to convey information

**Run automated check:**
Use `mcp__pal__codereview` with focus: "accessibility, WCAG 2.1 AA compliance" on the frontend diffs.

**Report format:**
```markdown
### Accessibility Audit
| Check | Status | Details |
|-------|--------|---------|
| ARIA labels | PASS/FAIL | {details} |
| Keyboard nav | PASS/FAIL | {details} |
| Color contrast | PASS/FAIL | {details} |
| Focus management | PASS/FAIL | {details} |
```

If blockers found, post a Jira comment:
```
[Agent Maestro-Review] Accessibility Issue Found
{description}
WCAG criterion: {e.g., 1.1.1 Non-text Content}
Affected file: {path}
Severity: {blocker / warning}
```

---

### 6. Database Migration Safety Check

**When research identified `aicoach.*` schema changes (or any SQL changes), validate migration safety.**

#### 6.1 Detect Changes

Search each approach for database modifications:
```bash
# In each approach branch
git diff main..feature/{epic}-approach-{x}-{name} -- "*.sql" "*/Degreed.SqlDb/*" "*/Migrations/*"
```

#### 6.2 Classify Each Change

| Change Type | Risk | Examples | Validation |
|------------|------|---------|------------|
| **Safe** | LOW | Add nullable column, add new table, add index | Auto-approve |
| **Caution** | MEDIUM | Add non-nullable column (needs default), modify SP, add constraint | Verify default value, check existing data |
| **Dangerous** | HIGH | Drop column, change column type, drop table, rename column | Require explicit user approval, verify rollback plan |

#### 6.3 Validate Per Approach

For each approach's migration:
- [ ] **Backwards-compatible?** Can the old code still run against the new schema?
- [ ] **Rollback safe?** Can the migration be reversed without data loss?
- [ ] **Migration script exists?** Is there a valid DbUp migration in `Degreed.SqlDb/Migrations/`?
- [ ] **Locking risk?** Will ALTER TABLE lock a large table? (Check row counts if available)
- [ ] **Default values?** Non-nullable new columns MUST have defaults for existing rows

#### 6.4 Report

```markdown
### Database Migration Safety
| Approach | Changes | Risk Level | Backwards Compatible | Rollback Safe |
|----------|---------|-----------|---------------------|--------------|
| A | Add column `aicoach.Coaches.NewField` (nullable) | LOW | Yes | Yes |
| B | Modify SP `aicoach.GetCoachById` | MEDIUM | Yes (additive) | Yes |
| C | Drop column `aicoach.Coaches.OldField` | HIGH — NEEDS APPROVAL | No | No |
```

---

### 7. Optimization Review

Use `mcp__pal__analyze` for automated optimization analysis on the changed files.

Check for:
- [ ] **N+1 queries** — Especially in .NET with Entity Framework
- [ ] **Unnecessary API round-trips** — Batch where possible
- [ ] **Missing async parallelism** — Use `asyncio.gather()` (Python) or `Task.WhenAll()` (C#)
- [ ] **Large payloads** — Are we sending more data than needed?
- [ ] **Missing caching** — Should results be cached in Redis?
- [ ] **SSE timeout safety** — Operations must complete within 600s window
- [ ] **Memory leaks** — Especially in streaming/SSE contexts
- [ ] **Index usage** — New queries should use existing indexes or new ones should be created

---

### 8. Security Audit

Run `mcp__pal__secaudit` on all changed files.

Manual security checks:
- [ ] No hardcoded secrets, tokens, or keys
- [ ] Input validation at all system boundaries
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection in frontend templates
- [ ] CSRF tokens on mutating requests
- [ ] Auth/access checks cannot be bypassed
- [ ] Three-layer guardrail precedence maintained (System > Platform > User)

---

### 9. Performance Benchmarking (Opt-In)

**Only run if the user requests it or the approaches differ significantly in performance characteristics.**

If applicable:
1. Use the `application-profiler` skill to profile each approach's key code paths
2. Compare response times, memory usage, CPU patterns between approaches
3. Add a "Performance" row to the comparison matrix with actual numbers

```markdown
### Performance Comparison (opt-in)
| Metric | Approach A | Approach B | Approach C |
|--------|-----------|-----------|-----------|
| Avg response time | {ms} | {ms} | {ms} |
| Memory footprint | {MB} | {MB} | {MB} |
| Async parallelism | {yes/no} | {yes/no} | {yes/no} |
```

---

### 10. Produce Review Report

Compile all findings into a structured report:

```markdown
## Feature Review Report — {Feature Name}

### Agent: {agent-name}
### Date: {today}

### 1. Dependency Validation
{from Section 1}
- Breaking changes: {count}
- Cross-project impacts verified: {count}

### 2. Code Quality
| Repo | Standards | Issues Found | Blockers |
|------|-----------|-------------|----------|
| Degreed (.NET) | .NET 8 / C# 11 | {count} | {count} |
| fe-workspace (Angular) | Angular 20 | {count} | {count} |
| degreed-coach-builder (Python) | Python 3.12 | {count} | {count} |
| degreed-flutter | Flutter 3.35 | {count} | {count} |

### 3. Apollo Component Check
| Component Needed | Apollo Available | Used Instead | Action |
|-----------------|----------------|-------------|--------|
| {component} | Yes/No | {what was used} | Use Apollo / Create Apollo / OK |

### 4. Optimization
{findings}

### 5. Security
{findings}

### 6. Overall Verdict
- [ ] PASS — Ready for documentation
- [ ] PASS WITH NOTES — Minor issues to address
- [ ] FAIL — Blockers must be fixed before proceeding
```

---

### 11. Update Jira

Post the review summary on the Epic and/or approach sub-tasks:

```
[Agent {name}] Code Review Complete — Approach {A|B|C}

Standards Compliance: {PASS/FAIL per repo}
Dependency Validation: {N breaking changes / all clear}
Apollo Components: {all available / {N} gaps flagged}
Security: {PASS/FAIL}
Optimization: {N suggestions}

{If blockers exist:}
BLOCKERS:
1. {blocker description}
2. {blocker description}

{If Apollo gaps exist:}
APOLLO COMPONENT GAPS:
- {component}: No Apollo equivalent found. Used {alternative}. Recommend creating Apollo component.
```

---

### 12. Fix Issues

If the review finds issues:
1. **Blockers (must fix):** Fix immediately before proceeding
2. **Warnings (should fix):** Fix if quick, otherwise note in PR description
3. **Suggestions (nice to have):** Note in PR description for future improvement
4. **Apollo gaps:** Post Jira comment (don't block on this)

After fixing, re-run the relevant tests to confirm.

---

## Agent Identity

When posting Jira comments during review, always sign with the agent's name:

```
[Agent Maestro-Alpha] Code Review Complete — Approach A
[Agent Maestro-Beta] Code Review Complete — Approach B
[Agent Maestro-Gamma] Code Review Complete — Approach C
```

This allows stakeholders to track which agent reviewed which approach.
