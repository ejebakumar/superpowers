---
name: team-context-test
description: Test the AIDATASCI-4785 team-context coach feature end-to-end against a deployed PR env. Activates when the user asks to test team context, verify team tools fire, check the 4-AND gate, or run a manager-coach scenario. Drives the team-context-chat CLI one command at a time and observes.
---

# Team Context Test Skill

Drive the team-context coach feature live as a manager — verify the .NET assembles the payload on Connect, Python persists it to Redis, the LLM calls one of the 5 team tools, and a `ui.card` SSE frame reaches the FE.

## When to Use

- User says "test team context", "test the team-context coach", "verify team tools fire"
- User wants to verify the AIDATASCI-4785 pivot architecture end-to-end
- User wants to check the 4-AND gate (`coach.canReferenceTeamData ∧ is_manager ∧ direct_reports>0 ∧ team_context_enabled`)
- User wants to confirm `event: ui.card` SSE frames flow when the LLM calls a team tool
- User wants to test a different manager / coach combo against the deployed PR env

## What this skill tests

1. **Authentication** — cookie+CSRF login as a manager
2. **Coach metadata** — coach must have `canReferenceTeamData=true`
3. **Manager team data** — manager must have direct reports (verified via `/api/managers/...`)
4. **Conversation creation** — a fresh conversation is created
5. **SSE chat turn** — POST `/api/coach/connect` + GET `/api/coach/chat/{sessionId}`, with `teamContextEnabled=true` to flip the per-conversation toggle on
6. **Team-tool invocation** — the LLM calls one of `get_team_member_profile` / `get_team_skill_overview` / `get_skill_gap_for_member` / `get_member_completions` / `get_team_engagement`
7. **`ui.card` SSE frame** — the tool runner emits the card; the SSE stream forwards it; the client parses it
8. **Datadog log presence** — `team_context_tool_invoked` log line appears in `service:degreed-coach-builder env:pr-827-localstaging`

## Setup

All files live in: `tools/team-context/`

| File | Purpose |
|------|---------|
| `team_context_chat.py` | Main CLI tool (one HTTP op per subcommand) |
| `team_context_env.json` | Env configs — `pr2610` (sdetmanager01 + lxpfepr2610), `local`, `staging` |
| `.sessions/` | Generated session state (gitignored) |

The venv must be activated. Prefix ALL commands with:

```bash
source degreed-coach-builder/venv/bin/activate &&
```

## Available Commands

### Login (required first)

```bash
python tools/team-context/team_context_chat.py login --env pr2610
```

Authenticates against the env and caches cookies + user_key + base_url to `.sessions/team_context.json`. Verify `user_key` matches the expected manager (sdetmanager01 = 2345691 in pr2610).

### Inspect manager team data

```bash
python tools/team-context/team_context_chat.py inspect-redis
```

Hits `/api/managers/managerdirectreportsummary` and `/api/managers/managerdirectreports`. **Must show ≥ 1 direct report** for the gate to open. In pr2610, sdetmanager01 has SDET Rep01 and SDET Rep02.

### Load coach metadata

```bash
python tools/team-context/team_context_chat.py load 859
```

Fetches the coach config. Verify in the output:

- `can_reference_team_data: true` — required for the gate
- `coach_state: Published` (or check separately)
- `title` — sanity-check it's the coach you expect

If `can_reference_team_data` is `false`, the gate cannot open. Either pick a different coach or use `tools/coach-create/coach_create.py enable-team-context` to flip it on.

### Create a conversation

```bash
python tools/team-context/team_context_chat.py start
python tools/team-context/team_context_chat.py start --coach-id 860   # override loaded coach
```

Creates a new conversation record. Captures `conversation_id` to session state.

### Send a chat message

```bash
python tools/team-context/team_context_chat.py send "Tell me about my team — who reports to me?"
python tools/team-context/team_context_chat.py send                                  # uses default team-prompt
```

POSTs `/api/coach/connect` with `teamContextEnabled=true`, then GETs the SSE stream. Parses every frame and reports:

- `sse_events` — total SSE frame count (>0 means streaming worked)
- `answer_chars` + `answer_preview` — assistant text the user sees
- `ui_cards` + `ui_card_types` + `ui_cards_preview` — team tool result cards
- `errors` — any `event: error` frames or transport errors
- `last_3_events` — for manual inspection of the trailing stream

### Diagnostics

```bash
python tools/team-context/team_context_chat.py status   # dump current session state
python tools/team-context/team_context_chat.py reset    # clear local session
```

## How to Run a Scenario

Drive the commands one at a time. Read each output BEFORE deciding the next step. Do not auto-batch — the whole point is observing intermediate state.

### Standard team-context scenario (pr2610 + coach 859 + sdetmanager01)

1. **Reset + login**: ensure clean state.
   - Run `reset`, then `login --env pr2610`.
   - **Assert:** `user: SDET Manager01`, `user_key: 2345691`. If different, stop and report.
2. **Inspect manager data**: confirm direct reports exist.
   - Run `inspect-redis`.
   - **Assert:** `members_count >= 1`. If 0, the manager has no reports and the gate will close — stop and report (the test data is wrong, not the feature).
3. **Load coach**: pick a coach with team-context enabled.
   - Run `load 859`.
   - **Assert:** `can_reference_team_data: true` and `coach_state: Published`. If either is wrong, stop and report.
4. **Start conversation**:
   - Run `start`.
   - Capture `conversation_id` from output.
5. **Send a team-prompting message**:
   - Run `send "Tell me about my team — who reports to me?"`.
   - **Read the output:**
     - `sse_events > 0` — stream worked
     - `answer_chars > 0` — assistant produced text
     - `ui_cards >= 1` — at least one team tool fired AND emitted a card
     - `ui_card_types` should include one of `team_overview`, `member_profile`, `team_engagement`, `skill_gap_comparison`, `member_completions`
     - `errors` should be empty
6. **Optional — drill into specific tools**:
   - `send "Tell me about SDET Rep01 specifically"` — should trigger `get_team_member_profile` → `member_profile` card
   - `send "What skills are my team weakest on?"` — should trigger `get_team_skill_overview` → `team_overview` card
   - `send "How engaged has my team been recently?"` — should trigger `get_team_engagement` → `team_engagement` card
   - Each turn ALSO uses the same `team_context` payload from Redis — no re-fetch.

### Negative test (gate-closed scenario)

To verify the gate closes correctly when prerequisites fail:

1. Login + load a coach with `canReferenceTeamData=false` (or a non-manager user).
2. Send the same team prompt.
3. **Expect:** `ui_cards: 0`, `answer_preview` does NOT include team-member names, no `team_context_tool_invoked` log in Datadog.

## What to verify in Datadog (alongside the SSE stream)

Open Datadog logs filtered to `service:degreed-coach-builder env:pr-827-localstaging` and search for:

- `team_context_tool_invoked` — exactly one line per `ui.card` you saw. The log structured-context shows `tool_name`, `manager_id`, `target_member_id`, `card_type`, `latency_ms`.
- `AIDATASCI4785_MIDDLEWARE_FIRED` (diagnostic — present while pivot is fresh) — shows the gate evaluation. `team_tools_enabled=True` confirms the 4-AND opened.
- `translate_agent_events finished` — `tool_calls` array shows what tools fired with what args; `tool_results` shows what they returned. `ok: true` is success.

If `team_context_tool_invoked` is missing but `tool_calls` shows the LLM tried to call a team tool, inspect `tool_results` for the error envelope reason — common ones:

- `missing_session` — RunnableConfig.configurable.session_id wasn't threaded through (regression of the 95c95b01 fix)
- `team_context_payload_missing` — .NET assembled gating flags but didn't ship the payload (gate eval mismatch)
- `member_not_in_team` — LLM hallucinated a member key not in the manager's team

## Observation Report

After running the scenario, report:

- **Env + identity**: env name, user, user_key, manager direct-report count
- **Coach**: id, title, `canReferenceTeamData`, `coach_state`
- **Conversation**: conversation_id created
- **Per-turn results**: prompt, answer preview, sse_events, ui_cards, ui_card_types, errors
- **Datadog cross-check**: `team_context_tool_invoked` count, what `tool_calls` and `tool_results` showed
- **Verdict**: PASS / PASS WITH NOTES / FAIL with reason
- **Issues found**: anything unexpected (empty cards, missing tool fires, gate misfires, hallucinated names)

## Anti-patterns (do NOT do)

- Do NOT chain all the commands into one shell pipeline and inspect only the last output. The whole point is observing intermediate state — `load` might say `can_reference_team_data: false` and `send` would then trivially fail; you'd waste a Datadog round trip.
- Do NOT assume `ui_cards >= 1` means the data is correct. The card may have empty `members[]` because .NET's payload assembly is still placeholder (Phase 3b TODO). Treat empty-shell cards as PASS WITH NOTES, not FAIL — the wiring is the test, not the data composition.
- Do NOT skip the `inspect-redis` step. If the dev DB doesn't have direct reports for the test manager, every other step will look fine until the LLM invokes a tool and gets back empty data — and the failure will look like a feature bug instead of a data-seed problem.
