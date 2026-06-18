# Generate Test Skill

Auto-generate a Claude Code test skill and Python CLI test tool for a feature.

## Arguments
- `$ARGUMENTS` — Feature name (e.g., `test-coach-voice`, `quiz-forms`, `roleplay-text`) or Jira ticket ID

## Instructions

You are executing the **Test Skill Generation** phase of the AI Native Feature Builder Pipeline. This creates a complete test skill following the established patterns (forms-test, coach-chat, quiz-attempt).

### What This Produces
1. **SKILL.md** in `.claude/skills/test-{feature}/` — Skill definition with commands and workflows
2. **Python CLI tool** in `tools/{feature}/` — Standalone test tool inheriting from `maestro_test_base.py`
3. **Config files** — Environment configs (local/PR/staging) and tool settings
4. **Test scenarios** — Happy path, edge cases, error handling

### Execution

Load the `feature-test-gen` skill and execute for: **$ARGUMENTS**

**Steps:**
1. If a Jira ticket ID is provided, fetch it to understand the feature
2. Analyze the feature's API endpoints across Python and .NET
3. Read existing test tools in `tools/` for pattern reference:
   - `tools/_shared/maestro_test_base.py` (base class)
   - `tools/forms-test/forms_chat.py` (most comprehensive example)
   - `tools/coach-chat/coach_chat.py`
4. Generate the test tool, skill, and configs
5. Create `.sessions/` directory with `.gitignore`
6. Present the generated files and test scenarios

**Rules:**
- The test tool must work standalone (no Claude dependency) for CI/CD
- Config files must support multiple environments
- Session state persisted in `.sessions/` (gitignored)
- Generate realistic test data, not placeholders
- Include verification/assertion logic, not just API calls
