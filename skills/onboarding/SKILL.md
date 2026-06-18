---
name: onboarding
description: "Walk a new developer through first-time setup of the ai_native pipeline — prereq detection, sub-repo cloning, plugin install, secrets via $EDITOR, MCP auth, smoke verification, and a brief pipeline tour. Activates on /onboard, 'help me set up', 'first time setup', 'onboard me', 'I just cloned this — what now?', 'walk me through setup'."
---

# Onboarding — Interactive First-Time Setup

A 7-phase conversational walkthrough that takes a freshly-cloned `ai_native` workspace from "I just got this" to "ready to run a feature pipeline." State is tracked in `.claude/setup-progress.json` (gitignored) so re-invocation resumes from where the user left off.

## When This Skill Activates

- **Slash command:** `/onboard` (with optional flags below)
- **Natural language triggers:** "help me set up", "first time setup", "onboard me", "I just cloned this", "what do I do first", "walk me through setup", "introduce me to the pipeline"

## Slash Command Variants

- `/onboard` — resume from last incomplete phase
- `/onboard --verify` — re-run Phase 6 (verification gauntlet) only
- `/onboard --redo {phase N}` — re-run a specific phase
- `/onboard --tour` — jump to Phase 7 (pipeline tour) only

## State File

Path: `.claude/setup-progress.json` (gitignored)

Format:
```json
{
  "started": "2026-05-06T10:30:00Z",
  "completed_phases": [0, 1, 2],
  "current_phase": 3,
  "skipped_phases": [],
  "last_updated": "2026-05-06T10:42:00Z"
}
```

Read on every invocation. Update after each phase succeeds. If file is missing, treat as fresh start at Phase 0.

## Conversational UX Rules (NON-NEGOTIABLE)

1. **One question at a time** — never multi-prompt the user with several decisions
2. **Short messages** — 2-3 sentences per phase intro; full detail only on request
3. **Show progress** — every message starts with `Phase N/7: {name}` so user knows where they are
4. **Celebrate small wins** — `✅ Pushover wired — phone pinged in 2s`
5. **Always offer an escape** — "Skip this and continue?" / "Pause here and resume later?"
6. **Detect, don't ask** — if a state can be verified by command, do that instead of asking
7. **NEVER print secret values** — even after format-validating them
8. **Fail fast with the fix** — when a verification fails, print the specific command that fixes it

---

## The 7 Phases

### Phase 0 — Detect Current State (silent)

Run these checks IN PARALLEL before saying anything:
- Sub-repos cloned? (`ls ../Degreed ../fe-workspace ../degreed-coach-builder ../degreed-assistant ../degreed-flutter`)
- `.env` exists? Has the required keys? (regex-check shape, not values)
- Plugins installed? (`claude plugin list | grep -E 'figma|claude-mem'`)
- MCP servers connected? (`claude /mcp` output parse)
- `gh` authenticated? (`gh auth status`)
- Hooks executable? (`test -x .claude/scripts/notify.sh`)
- Playwright Chromium present? (`ls ~/Library/Caches/ms-playwright/chromium-* 2>/dev/null`)

Build a state report. **If every check passes → skip directly to Phase 7 (tour) and tell the user "everything is already set up — let me give you the quick tour."**

Otherwise, write `.claude/setup-progress.json` with `current_phase: 1` and present the user with a single intro:

> Hi 👋 — I'll walk you through 7 phases of setup (~10-15 min). I detected: {N tools missing, M repos missing, etc.}. Ready to start with prereqs?

### Phase 1 — Prereqs Check (no auto-install)

Detect the 6 required CLI tools:

| Tool | Detect | Install (macOS) |
|---|---|---|
| `git` | `git --version` | (preinstalled) or `brew install git` |
| `gh` | `gh --version` | `brew install gh` |
| `claude` | `claude --version` | `brew install anthropic/claude/claude-code` |
| `jq` | `jq --version` | `brew install jq` |
| `node` | `node --version` (any version OK — used for `npx`) | `brew install node` |
| `uv` | `uv --version` | `brew install uv` |

For each missing tool, print the install command and pause. Don't install anything — wait for user to confirm they ran it. Re-check on confirmation.

If user is on Linux/Windows, adapt commands (`apt-get install gh`, etc.) and warn that ai_native is tested on macOS.

### Phase 2 — Repo Bootstrap (auto-clone)

The user already has `ai_native/`. Five sibling sub-repos must be cloned at the parent of `ai_native/`:

```
{parent-dir}/
├── ai_native/                  ← user already cloned this
├── Degreed/                    ← needs cloning
├── degreed-coach-builder/      ← needs cloning
├── degreed-assistant/          ← needs cloning
├── fe-workspace/               ← needs cloning
└── degreed-flutter/            ← needs cloning
```

Approach:
1. Show the user the 5 repos that need cloning
2. Ask: "Clone all 5 now via `gh repo clone`? Total ~2GB."
3. On yes: run in parallel
   ```bash
   cd ..
   gh repo clone degreed/Degreed &
   gh repo clone degreed/fe-workspace &
   gh repo clone degreed/degreed-coach-builder &
   gh repo clone degreed/degreed-assistant &
   gh repo clone degreed/degreed-flutter &
   wait
   ```
4. Verify each succeeded (`test -d ../{repo}/.git`)
5. If any failed, print the specific repo + error and ask user to retry manually

User is assumed to have org access — if `gh repo clone` fails with 404, prompt the user to verify their GitHub account has access to the `degreed` org and try again.

### Phase 3 — Claude Code Config

Run sequentially (each takes 30s-2min):

1. **Plugins:**
   ```bash
   claude plugin install figma@claude-plugins-official
   claude plugin install claude-mem@thedotmack
   ```

2. **Playwright Chromium** (~150MB one-time download):
   ```bash
   npx playwright install chromium
   ```

3. **Hook executability:**
   ```bash
   chmod +x .claude/scripts/*.sh .claude/hooks/*.sh
   ```

4. **Test-tool Python project** (if `tools/pyproject.toml` doesn't exist, create it):
   ```toml
   [project]
   name = "ai-native-test-tools"
   version = "0.0.0"
   requires-python = ">=3.11"
   dependencies = ["httpx>=0.27", "beautifulsoup4>=4.12"]
   ```
   Then run `cd tools && uv sync` to materialize the env.

After each step, verify with the appropriate command. If a step fails, surface the error verbatim and offer to retry.

### Phase 4 — Secrets via $EDITOR (NEVER via chat)

**The user must NEVER paste secrets into chat.** Pasted values land in transcripts and history.

Steps:

1. If `.env` doesn't exist: `cp .env.example .env && chmod 600 .env`

2. Tell the user what to fill, in priority order:

   **Required:**
   - `NOTIFY_PROVIDER=pushover`
   - `PUSHOVER_USER_KEY` — get at https://pushover.net (top of dashboard, 30 chars starting with `u`)
   - `PUSHOVER_APP_TOKEN` — create at https://pushover.net/apps/build (30 chars starting with `a`)

   **Optional (skip-able for v1):**
   - `DATADOG_API_KEY`, `DATADOG_APP_KEY` — for Datadog MCP (Datadog → Personal API Keys)
   - `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY` — for full PAL multi-model support
   - `CLAUDE_FEATURE_ID` — leave empty; conductor sets this per pipeline run

3. Open the user's editor on `.env`:
   ```bash
   ${EDITOR:-vi} .env
   ```
   The skill should pause until the editor exits (the bash command blocks).

4. After editor closes, **read `.env` and validate format only** (regex):
   - `PUSHOVER_USER_KEY` matches `^u[A-Za-z0-9]{29}$`
   - `PUSHOVER_APP_TOKEN` matches `^a[A-Za-z0-9]{29}$`
   - `NOTIFY_PROVIDER` is `pushover` or `ntfy`

5. If validation fails: "Your `PUSHOVER_USER_KEY` doesn't match the expected `u` + 29 alphanumeric chars format. Want me to reopen the editor?" — **never print the bad value**.

6. On success: confirm "✅ Required secrets validated" without printing values.

### Phase 5 — External Auth + Manual App Installs

These steps need the user to act outside Claude. For each, give a clear instruction, pause, and verify on confirmation.

| Step | User does | Claude verifies |
|---|---|---|
| `gh auth login` | Runs `gh auth login` in their terminal, follows browser flow | `gh auth status` shows authenticated |
| Install Pushover app | Install on iOS / Android, sign into the same account whose User Key is in `.env` | (verified by Phase 6 test notification) |
| Figma Desktop MCP toggle | Open Figma Desktop → Preferences → Beta features → Enable "Local MCP server" | `claude` shows `mcp__plugin_figma_figma__*` tools as deferred-available |
| Atlassian OAuth | First call to an Atlassian tool opens browser; user authenticates | `mcp__atlassian__atlassianUserInfo` returns successfully |
| Slack OAuth (optional) | Run `mcp__plugin_slack_slack__authenticate`, complete OAuth in browser | Tools beyond `authenticate` become available |

For each, the conversation looks like:

> Phase 5a/5: gh authentication. Run `gh auth login` in your terminal. Pick GitHub.com → HTTPS → browser. Tell me when done.

User: "done"

> Verifying… ✅ Logged in as {username}. Moving to next.

Skip the Slack OAuth if user says "skip — I don't use Slack."

### Phase 6 — Verification Gauntlet

Run a 10-step smoke check sequentially. Print one line per check with ✅ or ❌:

```
Verification gauntlet — 10 checks

✅ All 6 repos present (ai_native + 5 sub-repos)
✅ Tools detected (git, gh, claude, jq, node, uv)
✅ Hook scripts executable
✅ .env has required Pushover keys (format-validated, values not printed)
✅ Plugins installed (figma + claude-mem)
✅ Playwright Chromium downloaded
✅ MCP servers connected (14/14)
✅ gh authenticated as dfranklin07
✅ Stop hook fires without error (test payload accepted)
✅ Test notification received (user confirmed)
```

For check 10, fire a real notification and ask:
> Sent a test notification to your phone. Did it arrive? (it should say "Onboarding test · setup verified")

If user says yes → ✅. If no → diagnose: check NTFY_TOPIC vs NOTIFY_PROVIDER mismatch, App Token format, Pushover app installed, etc.

If ANY check fails:
- Don't proceed to Phase 7
- Print the exact failure + the fix command
- Offer to retry just that check or rewind to the relevant phase

### Phase 7 — Pipeline Tour (BRIEF — summary only)

Once Phase 6 passes, give a tight summary tour. Keep each section to 2-3 sentences. Don't drill into details unless the user asks.

```
🎉 Setup complete. Quick tour of the pipeline:

📋 Pipeline (9 phases): Intake → Research → ADR → Implementation (parallel
   worktrees) → Review → Documentation → Test Skill → Deploy → Live Test
   → Datadog. Each STOPS for your approval. Phone pings at every checkpoint.

📝 Plan is source of truth: every approach gets `docs/plans/{EPIC}-{approach}-plan.md`.
   Implementer follows it. You amend via `/update-plan {change}`. Drift = BLOCKED.

📱 Notifications: Pushover (default). Auto-tagged with [{FEATURE-ID}]. Ad-hoc:
   `/notify "<message>"`.

⌨️  Top slash commands:
   `/build-feature {EPIC}` — start full pipeline
   `/research-ticket {ID}` — research only
   `/deploy-feature {PR}` — deploy a PR to env
   `/update-plan "<change>"` — amend the active plan
   `/notify "<msg>"` — ping your phone
   `/never-again "<rule>"` — pin a learned rule into the pipeline (when implemented)

📁 Where things live:
   CLAUDE.md — workspace rules
   .claude/rules/feature-pipeline.md — pipeline rules
   .claude/skills/ — skill catalog (~30 skills)
   .claude/agents/ — specialized agents
   docs/plans/_PLAN_TEMPLATE.md — plan template
   docs/builds/ — per-feature build trackers

You're set. Run `/build-feature {your-EPIC-ID}` whenever you're ready to dive in.
```

Mark all phases as completed in `setup-progress.json`. Optionally fire a celebration notification:
```bash
.claude/scripts/notify.sh "Onboarding complete" "Setup verified in {duration}. Pipeline ready. Run /build-feature when you have an Epic." default tada
```

End the skill. Don't offer a sample run — the user said they want to dive into real work.

---

## Validation Pushback Rules

The skill REFUSES or pushes back when:

| Situation | Pushback |
|---|---|
| User pastes a Pushover token in chat | "Don't paste secrets into chat — they land in transcripts. I'll open `.env` in your editor instead." (Don't store the pasted value.) |
| User says "just install everything" | "I won't sudo-install system tools. Each tool installs with one `brew install` line — I'll print them and you run them." |
| User wants to skip Phase 6 | "Skipping verification means we won't catch broken setup until you hit a real bug. Sure?" |
| User wants to skip Phase 7 (tour) | "Brief tour is 30 seconds — worth doing. Or skip it and find docs at .claude/rules/feature-pipeline.md when needed." |
| Sub-repo clone fails with 404 | "Looks like your GitHub account doesn't have access to the `degreed` org. Verify membership at https://github.com/degreed and retry." |
| User on non-macOS | "ai_native is tested on macOS. I'll adapt commands for {Linux/Windows} but you may hit edge cases — let me know if anything fails." |
| User runs `/onboard` mid-pipeline (not first time) | "It looks like you've already used this workspace. Want to re-run verification only (`/onboard --verify`) or jump to the tour (`/onboard --tour`)?" |

## Files Touched / Created During Onboarding

| File | Created/Modified by | When |
|---|---|---|
| `.claude/setup-progress.json` | this skill | Phase 0+ (state tracking) |
| `.env` | user via `$EDITOR` | Phase 4 |
| `tools/pyproject.toml` | this skill | Phase 3 (if missing) |
| `tools/.venv/` | `uv sync` | Phase 3 (managed by uv, gitignored) |

The skill never edits committed files (CLAUDE.md, rules, other skills). Onboarding is read-only on the existing pipeline config.

## Re-Entry Behavior

- Re-running `/onboard` on a completed setup: detects state, jumps to Phase 7 tour ("everything's set — here's a refresher").
- `/onboard --verify`: runs only Phase 6 (10-step gauntlet). Useful after a system update, plugin reinstall, etc.
- `/onboard --redo phase 4`: re-runs a specific phase (useful if user rotates Pushover keys, etc.).
- `/onboard --tour`: Phase 7 only. Useful as a refresher.

## Companion Artifacts (For Users Who Skip the Skill)

- `setup.sh` — non-interactive bash fallback. Runs the same 6 detection + verification steps; prints install commands for missing tools; opens `$EDITOR` for `.env`. Exits non-zero on any unmet prerequisite.
- `SETUP.md` — human-readable companion doc. References this skill but provides a manual checklist for users who prefer reading over conversation.

The skill is the source of truth; the script and doc are conveniences that defer to it.
