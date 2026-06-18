---
name: a11y-review
description: "Analyze a Jira ticket, feature description, or code changes for WCAG 2.2 AA accessibility pitfalls. Use during feature intake, implementation review, or when asked for an a11y gut check. Part of the AI Native Feature Builder pipeline."
---

# Accessibility Review — WCAG 2.2 AA

Analyze requirements, designs, or code for accessibility pitfalls. Integrates with the AI Native Feature Builder pipeline.

**Standard:** WCAG 2.2 Level AA
**Reference:** https://www.w3.org/WAI/WCAG22/quickref/?levels=aaa

---

## When to Use

| Pipeline Phase | Trigger |
|----------------|---------|
| **Phase 0 (Intake)** | After extracting requirements, if UI is involved |
| **Phase 3 (Approaches)** | Agents reference patterns during implementation |
| **Phase 3.5 (Review)** | Verify a11y compliance before PR approval — STATIC analysis |
| **Phase 6/7 (Deploy + Live Test)** | LIVE Playwright + axe-core scan against deployed PR env (mandatory for FE changes) |
| **Ad-hoc** | User asks for "a11y review", "accessibility check", "a11y gut check" |

## Live A11y Scan — Required After Deploy (for FE changes)

Static analysis catches obvious a11y mistakes; live axe-core catches what static can't (computed contrast, ARIA semantics under real DOM, focus order with real CSS, dynamic content). When a PR env is deployed, run a live scan via the Playwright MCP — DO NOT rely on static analysis alone.

### Procedure
```
browser_navigate({url: "{pr-env-url}/{feature-route}"})
browser_evaluate({ function: "async () => { const {default: axe} = await import('https://cdn.jsdelivr.net/npm/axe-core@4/+esm'); return await axe.run(document, {runOnly: {type:'tag', values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}); }" })
```

For each interactive element / state change in the feature, also test:
- **Keyboard navigation** — `browser_press_key("Tab")` repeatedly; assert focus is visible at each step
- **Screen reader names** — `browser_snapshot()` returns the accessibility tree; verify every interactive node has a name
- **Live regions** — trigger an async update, then check the snapshot for the announced text

### Output
Save violations JSON to `docs/builds/{EPIC-ID}-evidence/axe-{route}.json`. Format and post as a PR review comment:

```markdown
**A11y Live Scan — {route}**
- Critical: {count}
- Serious: {count}
- Moderate: {count}
- Minor: {count}
- Top 3 violations:
  1. {rule-id} — {selector} — {help-url}
  ...
```

Any Critical or Serious violation = BLOCKER (the deployed PR env has real WCAG 2.2 AA failures, not theoretical ones). Moderate/Minor = warnings.

---

## Input Types

| Type | Example | How to Handle |
|------|---------|---------------|
| **Jira ticket** | `PD-12345` or URL | Fetch via `mcp__atlassian__getJiraIssue` with `fields: ["comment"]` |
| **Feature description** | "A modal with form fields" | Analyze directly |
| **Code diff/PR** | PR URL or file paths | Read the files, analyze patterns |
| **Figma/design** | URL or screenshot | Analyze visual patterns, note what can't be verified |

---

## Analysis Process

### 1. Classify Input

**Scan report** — Automated axe violations with no proposed fix:
> Stop and ask for the proposed solution before analyzing.

**Concrete** — Specific UI components, interaction patterns, or code:
> Proceed to analysis.

**Nebulous** — High-level feature description:
> Ask for more detail or warn that findings may be broad.

### 2. Check Against Concern Areas

Review each applicable area:

#### Semantic Structure
- [ ] Custom divs/spans used instead of semantic HTML (button, a, input)?
- [ ] Heading hierarchy skips levels?
- [ ] Missing landmarks (main, nav, aside)?

#### Keyboard Accessibility
- [ ] Interactive elements not focusable?
- [ ] Missing keyboard patterns (Enter/Space for buttons, Escape to close)?
- [ ] No visible focus indicator?
- [ ] Focus trap issues (modals not trapping, or trapping with no escape)?

#### Screen Reader Experience
- [ ] Icon-only buttons/links missing accessible name?
- [ ] Decorative icons not hidden (`aria-hidden="true"`)?
- [ ] Form inputs not associated with labels?
- [ ] Dynamic content updates with no live region?
- [ ] Error messages not programmatically associated?

#### ARIA Usage
- [ ] Using `disabled` instead of `aria-disabled`?
- [ ] Missing `aria-label` or `aria-labelledby` where needed?
- [ ] ARIA roles used incorrectly?
- [ ] ARIA used instead of fixing semantic HTML?

#### Color & Contrast
- [ ] Color alone conveys meaning (no icon/text backup)?
- [ ] Contrast likely below 4.5:1 (text) or 3:1 (UI)?

#### Touch & Motion
- [ ] Touch targets below 24x24px?
- [ ] Animation without `prefers-reduced-motion` check?

#### Forms
- [ ] Required fields indicated only visually?
- [ ] Missing autocomplete attributes on personal data fields?
- [ ] Inline validation not announced to screen readers?

### 3. Check Apollo Components

If the feature is in `fe-workspace`, check if Apollo components exist that handle the a11y concern:

```
Apollo components with built-in a11y:
- apo-button: focus ring, disabled state, keyboard
- apo-dialog/apo-modal: focus trap, Escape close, aria-modal
- apo-tabs: arrow key nav, aria-selected
- apo-dropdown: focus, keyboard nav, aria-expanded
- apo-toast: aria-live, role="alert"
- apo-form-field: label association, error binding
- apo-checkbox/apo-radio-group: proper roles, keyboard
- apo-tooltip: aria-describedby
```

**Suppress findings** if Apollo component handles the concern. List in "Handled by Apollo" section.

### 4. Reference Fix Patterns

For each pitfall, reference the fix from **`shared/a11y-patterns.md`**:

| Pitfall | Pattern Reference |
|---------|-------------------|
| Icon-only button | Section 1.1 — use `tw-sr-only` span or `aria-label` |
| Native disabled | Section 2 — use `aria-disabled="true"` |
| Modal focus | Section 3.1 — focus trap pattern |
| Status updates | Section 4.1 — `aria-live="polite"` |
| Form errors | Section 5.2 — `aria-invalid` + `aria-describedby` |

---

## Output Format

### For Pipeline Integration (Phase 0/3.5)

```markdown
## A11y Review: {Feature/Epic Name}

**Standard:** WCAG 2.2 AA
**Risk Level:** {High/Medium/Low}

### Pitfalls Found ({count})

1. **[Critical]** {Pitfall} — {impact}
   - WCAG: [X.X.X {criterion}](https://www.w3.org/WAI/WCAG22/Understanding/{slug})
   - Fix: {pattern reference from a11y-patterns.md}

2. **[Serious]** {Pitfall} — {impact}
   - WCAG: [X.X.X {criterion}](...)
   - Fix: {pattern reference}

### Handled by Apollo

- `apo-dialog` handles focus trap and Escape dismissal
- `apo-button` handles focus ring and keyboard activation

### A11y Requirements to Add

Include these in the implementation requirements:
- [ ] {Requirement 1}
- [ ] {Requirement 2}

### Cannot Verify (Design/Visual)

- Color contrast — needs design review
- Touch target sizes — needs measurement
```

### For Ad-hoc Review

```markdown
## A11y Gut Check

**Warnings** (sorted by severity):

1. [Critical] {Pitfall} — {why it matters} — [WCAG X.X.X](...)
   Fix: Use {pattern} from a11y-patterns.md

2. [Serious] {Pitfall} — {why it matters} — [WCAG X.X.X](...)
   Fix: Use {pattern}

**Handled by Apollo:** {list}

**Recommendation:** {proceed / address before implementation / needs design review}
```

---

## Severity Scale

| Level | Definition | Action |
|-------|------------|--------|
| **Critical** | Blocks access entirely (keyboard trap, no accessible name on primary action) | Must fix before merge |
| **Serious** | Significantly degrades experience (missing label, focus order issues) | Should fix before merge |
| **Moderate** | Causes friction but workable (ambiguous links, no reduced-motion) | Fix if time permits |
| **Minor** | Low impact standards violation (decorative image not hidden) | Note for future |

---

## Integration with Pipeline Skills

### In `feature-intake` (Phase 0)

After extracting requirements, if UI is involved:
```
→ Run a11y-review on the requirements
→ Add a11y pitfalls to the intake summary
→ Include a11y requirements in sub-task descriptions
```

### In `feature-approaches` (Phase 3)

Agent prompts should include:
```
When implementing UI, follow a11y patterns from shared/a11y-patterns.md:
- Icon-only buttons: use tw-sr-only or aria-label
- Disabled states: use aria-disabled, not disabled
- Modals: trap focus, restore on close
- Forms: associate labels, announce errors
- Dynamic content: use aria-live regions
```

### In `feature-review` (Phase 3.5)

Add to review checklist:
```
A11y Compliance:
- [ ] Semantic HTML used (button, not div with click)
- [ ] Keyboard accessible (all interactions)
- [ ] Focus managed (modals trap, restore on close)
- [ ] Screen reader friendly (accessible names, live regions)
- [ ] aria-disabled used (not native disabled)
- [ ] Apollo components used where available
```

---

## Quick Reference

```
ARIA Labels:
  Icon button    → <span class="tw-sr-only">Label</span>
  Decorative     → aria-hidden="true"

Disabled:
  Button/Link    → aria-disabled="true" + prevent click + disabled style

Focus:
  Modal open     → focus first element
  Modal close    → restore to trigger
  Custom widget  → visible :focus-visible ring

Live regions:
  Status         → aria-live="polite"
  Errors         → aria-live="assertive" OR role="alert"

Forms:
  Required       → aria-required="true"
  Error          → aria-invalid="true" + aria-describedby
```
