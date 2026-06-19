---
name: test-coach-create
description: Use when testing Maestro's Coach Builder live — creating and publishing coaches via the builder agent, including auto-generation, knowledge-base upload, validation, save, and publish through the .NET API.
---

# Coach Builder Test Skill

Create and publish coaches by driving the Maestro Studio builder agent through the .NET API, then verifying every generated field, configuration, knowledge base upload, and validation result.

## When to Use

- User says "test the coach builder", "create a test coach", "verify coach creation"
- User wants to test a specific coach scenario (e.g., "create a Java coach for 8th graders")
- User wants to verify KB file upload and RAG processing
- User wants to test feedback rubric generation
- User wants to verify coach validation and publishing

## Setup

All files are in: `tools/coach-create/`

| File | Purpose |
|------|---------|
| `coach_create.py` | Main CLI tool |
| `coach_create_env.json` | Environment configs (local, PR, staging) |
| `coach_create_config.json` | Tool settings (timeouts, auto-delete) |
| `coach_test_files.json` | Test KB file registry |
| `.sessions/` | Generated session state (gitignored) |

The venv must be activated. Prefix ALL commands with:
```bash
source degreed-coach-builder/venv/bin/activate &&
```

## Available Commands

### Login (required first)
```bash
python tools/coach-create/coach_create.py login --env pr2103
```
Environments: `local` (localhost:44300), `pr2103`, `staging`.

### Chat with builder agent
```bash
python tools/coach-create/coach_create.py send "I need a java coach for 8th graders"
```
Each `send` does a POST connect + GET SSE stream cycle. Continue the conversation until `create_coach_ready: true` appears (the agent returns a `Create_Coach` suggestion). Typical flow is 4-6 turns.

### Generate coach fields
```bash
python tools/coach-create/coach_create.py generate
```
Calls `POST /api/maestro/coach/fill` to extract structured fields from the conversation. Returns: `coachName`, `coachDescription`, `instructions`, `conversationStarter`, `persona`, `guardrails`, etc. Validates field length limits.

### Generate additional configurations
```bash
python tools/coach-create/coach_create.py config Persona
python tools/coach-create/coach_create.py config Guardrails
python tools/coach-create/coach_create.py config ConversationStarter
python tools/coach-create/coach_create.py config VocabularyToUse
python tools/coach-create/coach_create.py config VocabularyToAvoid
python tools/coach-create/coach_create.py config UserFeedback
```
Each generates additional items using AI. `UserFeedback` generates feedback rubric objects with `name`, `description`, `isQuantitative` fields.

### Upload knowledge base file
```bash
# By key from coach_test_files.json
python tools/coach-create/coach_create.py upload sales_pdf

# By absolute path
python tools/coach-create/coach_create.py upload /path/to/file.pdf
```
Automatically creates a draft GUID if needed, uploads via `POST /api/maestro/processfiles/{draftCoachId}`, then polls until processing completes (Pending → Processing → Success). Returns `knowledgeBaseId` and `docId`.

### Save coach as draft
```bash
python tools/coach-create/coach_create.py save
```
Creates the coach via `POST /api/maestro/coach`. Returns the server-assigned `coachId`.

### Validate coach
```bash
python tools/coach-create/coach_create.py validate
```
Calls `POST /api/maestro/coach/validate/{coachId}`. Reports `isValid` and any `invalidFields`.

### Publish coach
```bash
python tools/coach-create/coach_create.py publish
```
Sets `coachState` to `Published` via `PUT /api/maestro/coach` with `isPartial: true`.

### Load existing coach
```bash
python tools/coach-create/coach_create.py load 848
```
Fetches full coach details including KB, rubrics, permissions.

### Check name availability
```bash
python tools/coach-create/coach_create.py check-name "Java Quest Guide"
```

### Enable/disable team context
```bash
python tools/coach-create/coach_create.py enable-team-context          # Enable CanReferenceTeamData
python tools/coach-create/coach_create.py enable-team-context --disable  # Disable it
```
Performs a partial update (`PUT /api/maestro/coach` with `isPartial: true`) to toggle the `CanReferenceTeamData` flag on the loaded coach. Use after `save` or `load` to enable team context for testing with the `test-coach-chat` skill. The `load` command now shows `can_reference_team_data` and `mask_pii` in its output.

### Delete coach
```bash
python tools/coach-create/coach_create.py delete         # Current session's coach
python tools/coach-create/coach_create.py delete 848     # Specific coach
```

### Session management
```bash
python tools/coach-create/coach_create.py status
python tools/coach-create/coach_create.py reset          # Auto-deletes if configured
python tools/coach-create/coach_create.py files          # List test KB files
```

## How to Run a Scenario

1. **Reset and login**: `reset` then `login --env <env>`
2. **Drive the builder conversation**: Send messages describing the coach you want. Read each response. Continue until `create_coach_ready: true`.
3. **Generate fields**: Run `generate`. Verify the output: coach name, description length, instructions quality, starters.
4. **Generate configs**: Run `config` for each type. Verify items are relevant to the coach topic.
5. **Upload KB** (optional): Run `upload <file>`. Wait for polling to complete. Verify `knowledgeBaseId` returned.
6. **Save**: Run `save`. Capture the `coach_id`.
7. **Validate**: Run `validate`. Check `is_valid: true`.
8. **Publish**: Run `publish`. Check `coach_state: Published`.
9. **Load and verify**: Run `load <coach_id>`. Confirm all fields, KB, rubrics are persisted.
10. **Report observations**: Document what worked, what didn't, any quality issues.

## Observation Report

After completing the scenario, provide:
- **Scenario**: What type of coach was created
- **Conversation turns**: How many turns before `Create_Coach`
- **Generated fields quality**: Were name/description/instructions relevant and well-formed?
- **Config quality**: Were persona traits, guardrails, starters appropriate?
- **Rubrics quality**: Were feedback rubrics relevant with proper scoring rubrics?
- **KB upload**: Did file upload succeed? Processing time?
- **Validation**: Did validation pass? Any invalid fields?
- **Save/Publish**: Did the full lifecycle complete?
- **Issues found**: Bugs, unexpected behavior, quality problems

## Connection to coach-chat Skill

After creating and publishing a coach with this tool, use the `test-coach-chat` skill to test the learner conversation experience with the published coach. The `coach_id` from this tool is the input to `coach-chat load <coach_id>`.
