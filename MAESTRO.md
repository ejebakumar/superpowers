# Maestro AI-Native — ported into this fork

This fork merges **obra/superpowers** (14 discipline skills) with the **maestro-ai-native**
plugin (Earnest's Jira-Epic→PR feature pipeline, originally `dfranklin07/ai_native/.claude`).

## What was ported
| Area | Count | Location |
|------|-------|----------|
| Skills | 40 (+`shared/`) | `skills/` (alongside the 14 superpowers skills) |
| Agents | 7 (+INDEX) | `agents/` |
| Commands | 10 | `commands/` |
| Rules | 3 | `rules/` |
| Hooks (opt-in) | 5 | `hooks/maestro/` |
| Scripts | 5 | `scripts/maestro/` |
| Maestro skills index | — | `MAESTRO-SKILLS-INDEX.md` |

## Porting decisions
- **Hooks are NOT auto-wired.** The maestro hooks hardcode Degreed repo names
  (`degreed-coach-builder`, `Degreed`, `fe-workspace`, `degreed-flutter`, `degreed-assistant`)
  and `docs/plans/*` paths, so auto-firing them globally would leak Degreed context into every
  project. They are kept under `hooks/maestro/` as **opt-in**. To enable, add to your
  project `.claude/settings.json` (mirrors the original `ai_native/.claude/settings.json`):
  ```json
  { "hooks": {
      "PreToolUse": [
        { "matcher": "Bash", "hooks": [{ "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/pretooluse-security.sh" }] },
        { "matcher": "Edit|Write|MultiEdit", "hooks": [{ "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/pretool-plan-discipline.sh" }] }
      ],
      "PostToolUse": [ { "matcher": "Skill", "hooks": [{ "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/posttool-skill-log.sh" }] } ],
      "UserPromptSubmit": [ { "hooks": [{ "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/userpromptsubmit-context.sh" }] } ],
      "SubagentStop": [ { "hooks": [{ "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/subagentstop-validate.sh" }] } ]
  } }
  ```
- **`degreed-design-system`**: source had a redundant nested copy (removed) and kept its
  `SKILL.md` under `project/`. A copy was surfaced to the skill root for discovery; asset
  paths inside still reference `project/` and are verified during style adaptation.
- **No secrets** were carried over (scan clean — only env-var references like `$GITHUB_TOKEN`,
  `$PUSHOVER_*`). Non-secret workspace identifiers (Jira cloudId, Confluence space id) remain.

## Style adaptation (Phase 2 — in progress)
Skills are being rewritten to superpowers SKILL.md conventions (frontmatter `description`
in "Use when…" trigger form; Overview; rigid skills get Iron-Law + rationalization tables;
reference skills use tables/lists). Until a skill shows the superpowers structure, it is the
faithful original port.
