---
name: test-coach-chat
description: Test Maestro coach conversations as a learner — SSE chat, post-processing verification (summary, feedback, recommendations, inferences), follow-up context carry-over, and KB Q&A. Activates when the user asks to test a coach conversation, verify post-processing, check inferences, or test follow-up context.
---

# Coach Conversation Test Skill

Have learner conversations with published Maestro coaches through the .NET API, then verify all post-processing outputs (summary, feedback rubrics, recommendations, 9+ inference types) and test follow-up conversation context carry-over.

## When to Use

- User says "test this coach", "have a conversation with coach 848", "verify post-processing"
- User wants to verify SSE streaming works for coach chat
- User wants to check post-processing inferences (summary, feedback, recommendations)
- User wants to test follow-up conversation context (do previous inferences carry over?)
- User wants to test KB-aware Q&A (ask questions about uploaded knowledge base content)
- User created a coach with `test-coach-create` skill and wants to test the learner experience

## Setup

All files are in: `tools/coach-chat/`

| File | Purpose |
|------|---------|
| `coach_chat.py` | Main CLI tool |
| `coach_chat_env.json` | Environment configs |
| `coach_chat_config.json` | Settings (poll intervals, timeouts) |
| `.sessions/` | Generated state (gitignored) |

The venv must be activated. Prefix ALL commands with:
```bash
source degreed-coach-builder/venv/bin/activate &&
```

## Available Commands

### Login (required first)
```bash
python tools/coach-chat/coach_chat.py login --env pr2103
```

### Load coach configuration
```bash
python tools/coach-chat/coach_chat.py load 848
```
Loads the full coach config including persona, rubrics, KB, recommendations settings. Verify `coach_state: Published`.

### Set skill (Skills coaches only)
```bash
python tools/coach-chat/coach_chat.py set-skill \
    --skill-name Python --skill-level 3 --tag-id 17816 --auto-postprocess
```
Required when the coach is a Skills coach (`coach_sub_type: Skills`).
Stores `{name, level, tagId}` on session state — subsequent `send` calls
forward it as the connect-body `skill` payload, which is what the FE
does for skill-review conversations. The Python service uses the
presence of `skill.tagId` on the unified session to bind the
`Generate_Skill_Report` learner-chat tool.

`--auto-postprocess` makes `send` automatically run the post-process
pipeline whenever the SSE response contains a `skill_report_button`
suggestion (i.e. the coach decided the assessment is done and called
the Generate_Skill_Report tool). This is the test-driver equivalent of
the learner clicking the FE button.

Skill ids/levels can be obtained from `/api/user/getuserprofiletags` on
the FE host with the same cookies.

### Start conversation
```bash
python tools/coach-chat/coach_chat.py start
python tools/coach-chat/coach_chat.py start --coach_id 848  # Override loaded coach
```
Creates a conversation record. Returns `conversation_id`.

### Begin (coach-first greeting via event=connect)
```bash
python tools/coach-chat/coach_chat.py begin
```
Fires the SSE flow with `event="connect"` and an empty prompt so the coach
speaks first — the same path the FE takes whenever it opens a conversation
(`event: prompt ? 'chat' : 'connect'`). This is the text-mode counterpart of
voice mode's "agent speaks first on join."

Use this immediately after `start` (and `set-skill` for Skills coaches) and
BEFORE any `send`. The server dispatches connect to `_enqueue_begin_messages`
→ `llm_text_begin_message`, which by design never binds Generate_Skill_Report
and never injects the Section 3 tool-bridge — so the greeting can't
accidentally surface a skill-report button. Subsequent `send` calls then go
through the chat path (`event="chat"`) where the tool IS bound.

`begin` refuses to run if the conversation already has chat turns, since a
second greeting would fight the "NO REPEATED GREETINGS" guidance in the coach
prompt and pollute history.

### Send chat message
```bash
python tools/coach-chat/coach_chat.py send "Hi coach"
python tools/coach-chat/coach_chat.py send "Can you teach me about variables in Java?"
```
Each `send` does POST `/api/coach/connect` + GET `/api/coach/chat/{sessionId}` SSE stream. Output includes:
- `answer`: The coach's response text
- `message_id`: Server-assigned ID (assigned on final SSE event)
- `event_count`: Number of SSE events received
- `validation`: Checks for non-empty answer, message_id assigned, coach_id match

### Trigger post-processing
```bash
python tools/coach-chat/coach_chat.py postprocess
```
Calls `PUT /api/coach/v1/conversations/updatepartial`. Returns `request_id` for polling.

### Poll extraction status
```bash
# Poll all 6 extraction types in parallel
python tools/coach-chat/coach_chat.py poll --type all --timeout 120

# Poll specific type
python tools/coach-chat/coach_chat.py poll --type UserFeedback
python tools/coach-chat/coach_chat.py poll --type ConversationSummary
python tools/coach-chat/coach_chat.py poll --type Recommendations
python tools/coach-chat/coach_chat.py poll --type ConversationContext
python tools/coach-chat/coach_chat.py poll --type TaskItems
python tools/coach-chat/coach_chat.py poll --type KirkpatrickEvaluation
```
Polls `GET /api/maestro/requests/{requestId}/{type}` until Success/Failure/Timeout. Reports per-type status.

### Fetch detailed results
```bash
python tools/coach-chat/coach_chat.py summary          # Conversation summary text
python tools/coach-chat/coach_chat.py feedback          # User feedback rubric scores
python tools/coach-chat/coach_chat.py recommendations   # Recommended content/pathways/mentors
python tools/coach-chat/coach_chat.py inferences        # All inference types and counts
python tools/coach-chat/coach_chat.py conversation      # Full state: messages + inferences + recs
```

Each command fetches the data AND validates it:
- **summary**: Checks non-empty markdown text
- **feedback**: Parses double-encoded `inferredData` JSON, extracts rubric scores
- **recommendations**: Counts inputs/pathways/targets/mentors
- **inferences**: Verifies 9+ types present (ConversationContext, Feedback, KirkpatrickEvaluation, etc.)
- **conversation**: Full picture of messages, inferences, recommendations, summaries

### Follow-up conversation
```bash
python tools/coach-chat/coach_chat.py followup
```
Creates a new conversation for the same coach. Checks that the previous conversation has a `ConversationContext` inference (which seeds the next conversation). After `followup`, use `send` to chat and verify the coach references prior context.

### Message feedback
```bash
python tools/coach-chat/coach_chat.py message-feedback 17988 Inaccurate
```
Submit thumbs-down feedback on a specific message. Types: `Inaccurate`, `NotSatisfactory`, `NotWhatIAskedFor`, `Inappropriate`, `Harmful`, `Other`.

### Cleanup
```bash
python tools/coach-chat/coach_chat.py delete-conversation         # Current
python tools/coach-chat/coach_chat.py delete-conversation 3321    # Specific
python tools/coach-chat/coach_chat.py reset                       # Auto-deletes if configured
```

## How to Run a Full Test

### Basic conversation + post-processing:

1. `login --env <env>`
2. `load <coach_id>` — verify coach is Published with expected config
3. `start` — create conversation
4. `begin` — receive the coach's opening greeting (event=connect, FE parity)
5. `send "Hi coach"` — first learner turn, verify SSE streams
6. `send "Can you teach me about <topic>?"` — topical message
7. `postprocess` — trigger extraction
8. `poll --type all --timeout 120` — wait for all extractions
9. `summary` — verify summary quality
10. `feedback` — verify rubric scores (if coach has rubrics)
11. `recommendations` — verify relevant content suggested
12. `inferences` — verify 9+ types present
13. `conversation` — full state verification

### KB Q&A test (for coaches with knowledge bases):

1. Same setup as above
2. `send "What does the document say about <specific topic in KB>?"` — targeted KB question
3. Verify the answer references KB content accurately

### Follow-up context test:

1. Complete a conversation + post-processing (steps 1-11 above)
2. `followup` — verify `ConversationContext` inference exists, new conversation created
3. `send "Let's continue where we left off"` — verify coach references prior topics
4. Verify the coach's response demonstrates awareness of the previous conversation

### Team context test (for coaches with CanReferenceTeamData enabled):

**Prerequisites:** Test user must be a manager with direct reports. Enable team context via `test-coach-create`:
```bash
python tools/coach-create/coach_create.py load <coach_id>
python tools/coach-create/coach_create.py enable-team-context
```

1. `login --env <env>` (as a manager user)
2. `load <coach_id>` — verify `can_reference_team_data: true` and `mask_pii: false`
3. `start` — create conversation
4. `send "Give me an overview of my team"` — verify coach names specific direct reports
5. `send "Tell me about [member name]'s skill gaps"` — verify specific ratings and gap numbers
6. `send "How should I prepare for my 1:1 with [member name]?"` — verify actionable, data-driven advice
7. Verify the coach does NOT hallucinate team members not in the data
8. Test privacy: login as a non-manager, repeat step 4 — verify generic response (no team data)

**What to look for:**
- Coach references direct reports by name (not generic "your team members")
- Coach cites specific skill ratings and gap numbers
- Coach mentions engagement status when relevant
- Tool calls appear in SSE events (get_member_details, get_member_skills, get_team_overview)
- Non-managers get coaching without any team data leakage

### Multi-conversation test:

1. Create coach with `test-coach-create`, save + publish
2. Run basic conversation test
3. Run follow-up context test
4. Run KB Q&A test (if coach has KB)
5. Run team context test (if coach has team context enabled)
6. Clean up: `reset`

## Observation Report

After completing the scenario, provide:
- **Coach tested**: ID, name, type, whether it has KB/rubrics
- **SSE streaming**: Did messages stream correctly? Event counts? Latency?
- **Response quality**: Were answers contextually relevant? Did they match coach persona?
- **KB accuracy**: Did KB-aware answers reference document content correctly?
- **Post-processing results**:
  - Summary: Quality and completeness
  - Feedback: Rubric scores, whether they reflect the actual conversation
  - Recommendations: Relevance of suggested content
  - Inference types: How many of the 9+ expected types were generated
- **Follow-up context**: Did the new conversation reference prior topics?
- **Issues found**: Bugs, timeouts, quality problems, missing inferences

## Typical Full E2E Workflow (with coach-create)

```bash
# Phase 1: Create coach (using coach-create skill)
python tools/coach-create/coach_create.py login --env pr2103
python tools/coach-create/coach_create.py send "I need a java coach for 8th graders"
# ... continue conversation ...
python tools/coach-create/coach_create.py generate
python tools/coach-create/coach_create.py config UserFeedback
python tools/coach-create/coach_create.py upload sales_pdf
python tools/coach-create/coach_create.py save
python tools/coach-create/coach_create.py validate
python tools/coach-create/coach_create.py publish
# Note the coach_id from save output

# Phase 2: Test conversation (using this skill)
python tools/coach-chat/coach_chat.py login --env pr2103
python tools/coach-chat/coach_chat.py load <coach_id>
python tools/coach-chat/coach_chat.py start
python tools/coach-chat/coach_chat.py begin  # coach-first greeting (FE parity)
python tools/coach-chat/coach_chat.py send "Hi coach"
python tools/coach-chat/coach_chat.py send "Teach me about Java variables"
python tools/coach-chat/coach_chat.py send "What does the sales document say?"
python tools/coach-chat/coach_chat.py postprocess
python tools/coach-chat/coach_chat.py poll --type all
python tools/coach-chat/coach_chat.py summary
python tools/coach-chat/coach_chat.py feedback
python tools/coach-chat/coach_chat.py recommendations
python tools/coach-chat/coach_chat.py inferences
python tools/coach-chat/coach_chat.py followup
python tools/coach-chat/coach_chat.py send "Continue from where we left off"
python tools/coach-chat/coach_chat.py reset

# Phase 3: Cleanup
python tools/coach-create/coach_create.py delete
python tools/coach-create/coach_create.py reset
```
