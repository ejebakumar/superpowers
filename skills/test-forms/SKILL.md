---
name: test-forms
description: Test the Maestro Forms Agent by running a scenario through the live API. Activates when the user asks to test the forms agent, run a forms scenario, or verify forms behavior.
---

# Forms Agent Test Skill

Test the Maestro Forms Agent by having a real conversation through the .NET API, observing each response, and reporting what happened.

## When to Use

- User says "test the forms agent", "run a forms scenario", "verify forms flow"
- User provides a test scenario like "create a 10-question graded quiz about Python"
- User wants to verify a specific bug fix in the forms agent
- User wants to test file upload + question generation flow

## Setup

All files are in: `tools/forms-test/`

| File | Purpose |
|------|---------|
| `forms_chat.py` | Main CLI tool |
| `forms_env.json` | Environment configs (local, PR, staging) |
| `forms_test_files.json` | Test file registry |
| `forms_config.json` | Tool config — set `auto_delete_on_reset` to auto-cleanup quizzes |
| `test_forms_agent.py` | Standalone automated test (older) |
| `.sessions/` | Generated session state (gitignored) |
| `README.md` | Full documentation |

The venv must be activated. Prefix ALL commands with:
```bash
source degreed-coach-builder/venv/bin/activate &&
```

## Available Commands

### Login (required first)
```bash
python tools/forms-test/forms_chat.py login --env local
```
Environments: `local` (localhost:44300), `pr2103`, `staging`. Configured in `tools/forms-test/forms_env.json`.

### Send a message
```bash
python tools/forms-test/forms_chat.py send "your message"
```

### Accept Apply Changes + send message
```bash
python tools/forms-test/forms_chat.py send --accept "your message"
```
Use when previous response had `pending_apply: true` and you want to accept changes.

### Decline Apply Changes + send message
```bash
python tools/forms-test/forms_chat.py send --decline "your message"
```

### Edit an existing quiz (Edit with Maestro)
```bash
# Load quiz and start edit session
python tools/forms-test/forms_chat.py edit 274

# Load quiz and send first message in one step
python tools/forms-test/forms_chat.py edit 274 -m "Show me the current settings"
```
Loads the full quiz (questions with IDs, settings, topics, skills) via `GET /api/maestro/experiences/Quiz/{quizId}`, stores it as `current_metadata`, and sets up the session for editing. Subsequent `send` commands work the same as creation mode — the metadata includes `quizId` so the agent knows it's editing.

**Edit mode flow:**
1. `login --env <env>` — authenticate
2. `edit <quiz_id>` — load existing quiz
3. `send "your edit request"` — make changes via chat
4. `send --accept "yes"` — accept changes
5. `save` — persist changes (uses PUT for existing quizzes)

### Upload a file
```bash
# By key from forms_test_files.json
python tools/forms-test/forms_chat.py upload sales_mcqs -m "Use this file for questions"

# By absolute path
python tools/forms-test/forms_chat.py upload /path/to/file.pdf -m "Generate from this"
```
Uploads the file via `POST /api/maestro/File`, then sends a chat message with `isFileUploaded=true` so the agent processes and acknowledges the file topics.

### List available test files
```bash
python tools/forms-test/forms_chat.py files
```

### Save the form to database
```bash
python tools/forms-test/forms_chat.py save
```
Creates (POST) or updates (PUT) the quiz via `/api/maestro/Quiz`. Saves as Draft by default.

### Publish the form
```bash
python tools/forms-test/forms_chat.py publish
```
Sets `quizState` to `Published` via PUT. The quiz must be saved first. Once published, learners can take the quiz.

### Delete a quiz
```bash
# Delete the current session's quiz
python tools/forms-test/forms_chat.py delete

# Delete a specific quiz by ID
python tools/forms-test/forms_chat.py delete 250
```
Calls `DELETE /api/maestro/Quiz/{quizId}`. Use this to clean up test quizzes.

### Admin Results-page insights
```bash
# Summarize all 9 admin endpoints for the current session's quiz
python tools/forms-test/forms_chat.py admin-insights

# For a specific quiz, with full raw payloads
python tools/forms-test/forms_chat.py admin-insights 274 --verbose
```
Hits the 9 endpoints used by the Maestro admin Results page (quiz details, has-attempts, attempt numbers, summary, header metrics, question performance, answer distribution, scale distribution, free-text responses) and returns a compact summary of which question types have populated data. Useful for verifying that learner attempts flow through to admin reporting after a quiz is published.

### Check session status
```bash
python tools/forms-test/forms_chat.py status
```

### Reset session
```bash
python tools/forms-test/forms_chat.py reset
```
If `auto_delete_on_reset` is `true` in `forms_config.json` (default), this also deletes the saved quiz from the database before clearing state.

## How to Run a Scenario

When the user gives you a scenario, follow this process:

1. **Reset and login**: Start fresh with `reset` then `login --env <env>`
2. **Upload files if needed**: Use `upload <key>` with a message. The agent will list extracted topics.
3. **Drive the conversation**: Read each agent response, decide what to say next. You are the user — respond naturally.
4. **Handle Apply Changes properly**:
   - When `pending_apply: true` appears, decide whether to accept or decline
   - `--accept`: agent's metadata becomes your current metadata, sent with `metadataAccepted=true`
   - `--decline` or plain `send`: keep old metadata, sent with `metadataAccepted=false`
5. **Save when done**: Use `save` to persist the form
6. **Publish if needed**: Use `publish` to make the quiz available to learners
7. **Clean up**: Use `delete` to remove the test quiz, or just `reset` (auto-deletes if configured)
7. **Report observations**: After each turn, note what went well and what didn't

## Observation Report

After completing the scenario, provide a structured report:

### What to report
- **Scenario**: What was tested
- **Turns**: How many turns the conversation took
- **Each turn**: What you sent, what the agent responded, any issues noticed
- **File uploads**: Were files processed? Were topics extracted correctly?
- **Apply Changes**: Did the accept/decline protocol work correctly?
- **Counts**: Were question counts accurate? Graded/non-graded split correct?
- **Settings**: Were settings changes reflected in metadata?
- **Save**: Did the form save successfully? What quiz_id was returned?
- **Issues found**: Any bugs, unexpected behavior, or regressions
