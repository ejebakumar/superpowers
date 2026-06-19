---
name: test-ask-maestro
description: Use when testing Maestro's Ask Maestro multi-agent supervisor live — exercising the LangGraph supervisor and sub-agents, SSE events, HITL resume, file upload/RAG, and PR-deploy smoke tests via the .NET /api/ask-maestro/* surface.
allowed-tools: [Bash, Read]
---

# Test Ask Maestro

Drive the Ask Maestro feature against a deployed PR environment (or staging /
local). This skill matches the system shipped in PR #2753 — the Python service
lives at `degreed-ask-maestro/` (NOT `degreed-coach-builder/`), the supervisor
runs on LangGraph, and the .NET proxy is `AskMaestroController` at
`/api/ask-maestro/*`.

## Wire path

```
Browser  → .NET /api/ask-maestro/orchestrator/connect    (cookie + CSRF auth,
                                                          [ValidateAskMaestroAccess])
         → AskMaestroController.WithDgaRequestContext (injects user_profile_key,
                                                       organization_id, cookies,
                                                       host into ConnectModel)
         → AskMaestroOrchestrator.OrchestratorConnectAsync
         → POST {python}/v1/orchestrator/connect    → {"thread_id": "t_..."}
         → POST .NET /orchestrator/message/{tid}    body: {"content": "..."}
         → GET  .NET /orchestrator/stream/{tid}     SSE (text/event-stream)
         → POST .NET /orchestrator/resume/{tid}     when HITL card appears
```

The deployed PR URL is `https://lxpfepr2753.degreed.dev` and the Python service
URL is currently hardcoded in `AskMaestroOrchestrator.cs` to
`https://dgadev.ap.loclx.io` (the `AskMaestroURL` config key is not yet wired).
The test tool only knows about the .NET surface — Python lives behind the proxy.

## CLI tool

`tools/ask-maestro-test/ask_maestro_chat.py` — atomic verbs that map 1:1 onto
the controller endpoints. Run via `python tools/ask-maestro-test/ask_maestro_chat.py …`.

| Command | Maps to |
|---|---|
| `login --env <env>` | UI login (cookie + CSRF, stores `identity.v4`) |
| `connect` | `POST /api/ask-maestro/orchestrator/connect` → `{thread_id}` |
| `message "<q>"` | `POST /api/ask-maestro/orchestrator/message/{tid}` body `{content}` |
| `stream [--max-events N] [--timeout S]` | `GET /api/ask-maestro/orchestrator/stream/{tid}` SSE |
| `ask "<q>"` | `connect` + `message` + `stream` in one shot |
| `resume --action confirm [--interrupt-id ID --card-type TYPE --payload JSON]` | `POST /api/ask-maestro/orchestrator/resume/{tid}` |
| `cancel` | `POST /api/ask-maestro/orchestrator/cancel/{tid}` |
| `disconnect` | `POST /api/ask-maestro/orchestrator/disconnect/{tid}` |
| `upload <file>` | `POST /api/ask-maestro/files/upload` (multipart, 30MB cap) |
| `file <fileId>` | `GET /api/ask-maestro/files/{fileId}` |
| `file-preview <fileId>` | `GET /api/ask-maestro/files/{fileId}/preview` |
| `file-delete <fileId>` | `DELETE /api/ask-maestro/files/{fileId}` |
| `status` | dump local session state |
| `reset` | clear local session |

Session state is at `tools/ask-maestro-test/.sessions/ask_maestro_session.json`;
per-stream SSE evidence (one JSON event per line) is at
`tools/ask-maestro-test/evidence/{thread_id}/stream-*.jsonl`.

`resume` is convenient — if you've just streamed and got a `card.requires_input`
event, the CLI saves it as `pending_interrupt` in session state, so the next
`resume --action confirm` infers `interrupt_id` + `card_type` automatically.

## Environments

Defined in `tools/ask-maestro-test/ask_maestro_env.json`:

- `pr2753`  → `https://lxpfepr2753.degreed.dev` (the freshly deployed PR — default)
- `staging` → `https://staging.degreed.com`
- `local`   → `https://localhost:44300`

Add a new PR env by appending an entry — same shape as `dga_chat_env.json`.
Credentials are the same as the DGA test tool because the same test user owns
the Maestro flag.

## SSE event taxonomy (DEMO.md §2)

The supervisor surface emits typed SSE events. Each stream run summarises which
event types were observed. Known events:

| Event | Meaning |
|---|---|
| `session.start` | First event — carries `thread_id` + `agent_pool` |
| `agent.thinking.start` / `agent.thinking.end` | Supervisor or specialist deliberating |
| `agent.routed` | Supervisor handed off to a specialist (`from`, `to`) |
| `tool.invocation.start` / `tool.invocation.end` | MCP tool call boundaries (`tool_name`, `args`) |
| `tool.auth_rejected` | 401 from the MCP server — PAT misconfigured (non-retryable) |
| `card.appeared` | A card was rendered — `card_type` + `card_data` |
| `card.updated` | Existing card mutated |
| `card.requires_input` | HITL pause — `interrupt_id`, `card_type`, `card_data` |
| `cost.warning` | Token usage crossed `COST__WARNING_THRESHOLD` |
| `cost.exceeded` | Token usage crossed `COST__PER_CONVERSATION_TOKEN_CAP` |
| `stream.end` | Terminal — `reason ∈ {"done","error","cancelled"}` |
| `heartbeat` | Keep-alive |

The CLI flags any event NOT in this set as `unknown_events` in the summary —
useful for catching schema drift.

## Scenarios (the user picked these — 3 happy paths + file upload + HITL)

Each scenario is a deliberate composition of CLI verbs. Claude runs them one
command at a time and reads the JSON output between steps to decide what's next.

### Scenario A — Find Content (happy path)

```bash
python tools/ask-maestro-test/ask_maestro_chat.py login --env pr2753
python tools/ask-maestro-test/ask_maestro_chat.py ask \
    "Find me 3 intro courses on Python"
```

**Expect:** `events_by_type` contains `session.start`, `agent.routed{to:find_content}`,
`tool.invocation.start{tool_name:search_content}`, at least one `card.appeared`
with `card_type:content_results`, and `stream.end{reason:done}`. `card_count >= 1`.

### Scenario B — Curate Pathway (vague — triggers HITL)

```bash
python tools/ask-maestro-test/ask_maestro_chat.py ask \
    "Build a 3-hour pathway on Python for new engineers."
```

**Expect:** `agent.routed{to:curate_pathway}`, one or more `tool.invocation.start`
(`search_content` per section), then either:
- A `card.appeared{card_type:pathway_preview}` if the agent committed, OR
- A `card.requires_input{card_type:pathway_section_picker}` if M5.5 wired
  the "restructure?" question (per DEMO.md §3 Scenario B).

If `pending_interrupt` is populated in `status`, run the resume flow next:

```bash
python tools/ask-maestro-test/ask_maestro_chat.py resume \
    --action confirm \
    --payload '{"action":"confirm","selections":[{"section_id":"s_1","content_ids":["c_1","c_2","c_3"]}]}'
python tools/ask-maestro-test/ask_maestro_chat.py stream
```

### Scenario C — Update Skill (HITL is the happy path)

```bash
python tools/ask-maestro-test/ask_maestro_chat.py ask "Rate my Python skill at 7."
```

**Expect:** `agent.routed{to:update_skill}`, `tool.invocation.start{tool_name:find_tag}`,
`card.appeared{card_type:skill_lookup_result}`, then `card.requires_input{
card_type:skill_proficiency_picker}`. `pending_interrupt` populated.

Confirm the rating:

```bash
python tools/ask-maestro-test/ask_maestro_chat.py resume --action confirm \
    --payload '{"action":"confirm","level":7}'
python tools/ask-maestro-test/ask_maestro_chat.py stream
```

**Expect (post-resume):** `tool.invocation.start{tool_name:rate_skill}`,
`card.appeared{card_type:skill_rating_confirmed}`, `stream.end{reason:done}`.

### Scenario D — File upload + RAG

```bash
# Generate a small fixture if none exists
mkdir -p tools/ask-maestro-test/test-files
python3 -c "
import fitz
doc = fitz.open(); p = doc.new_page()
p.insert_text((72,72), 'Demo Pathway Source', fontsize=24)
p.insert_text((72,120), 'Section 1: Intro. Section 2: Deep dive.', fontsize=12)
doc.save('tools/ask-maestro-test/test-files/demo.pdf')
"

python tools/ask-maestro-test/ask_maestro_chat.py upload \
    tools/ask-maestro-test/test-files/demo.pdf
```

**Expect:** `validation.got_file_id == true`, `validation.parse_ready == true`,
response includes `file_id`, `page_count`, `token_count`, `ingestion_strategy`
(`full_inject` for small files; `rag` once the embedding pipeline lands).

Then drive a turn that the agent should ground on the uploaded doc:

```bash
python tools/ask-maestro-test/ask_maestro_chat.py ask \
    "Use the document I just uploaded to build a pathway."
```

**Expect:** events reference the file's content (the file_id is in session
state; the supervisor should pick up the uploaded context).

### Scenario E — HITL resume (focused, no upstream prompt)

If you already have a thread with a pending interrupt and want to drive only
the resume side:

```bash
python tools/ask-maestro-test/ask_maestro_chat.py status   # confirm pending_interrupt
python tools/ask-maestro-test/ask_maestro_chat.py resume --action confirm
python tools/ask-maestro-test/ask_maestro_chat.py stream
```

The `resume` verb defaults `interrupt_id` and `card_type` from the stored
`pending_interrupt`. Pass `--payload` if the card needs a structured selection;
otherwise the body defaults to `{"action": "<your action>"}`.

## How to run a scenario

1. **Activate the venv** — `source degreed-coach-builder/venv/bin/activate`
   (the tool only needs `httpx`, `beautifulsoup4`, and `PyMuPDF` for the PDF
   fixture; the coach-builder venv has all of them)
2. **Login** — `ask_maestro_chat.py login --env pr2753`
3. **Run the scenario verbs one at a time** — read the JSON output between
   steps. Each command echoes a structured result; `status` shows current
   session state.
4. **Inspect the SSE log** — `tools/ask-maestro-test/evidence/{thread_id}/stream-*.jsonl`
   has every event from the stream, one JSON per line, in order.
5. **Report** — see below.

## Observation report

After completing a scenario, give the user a structured report:

- **Scenario**: A / B / C / D / E (or freeform)
- **Env + thread**: env name + `thread_id`
- **Event counts**: total + by-type histogram
- **Cards observed**: list of `card_type`s
- **HITL**: was `card.requires_input` raised? was it resolved by `resume`?
- **Stream end**: `reason`?
- **Unknown events**: any types outside the documented taxonomy (likely schema drift)
- **Validation block**: `session_start_seen`, `any_card_appeared`, `stream_ended`,
  `no_unknown_events` — all should be `true` for a healthy run
- **Evidence path**: link to the JSONL file
- **Issues**: anything that looks off (out-of-order events, missing `agent.routed`,
  empty `card_data`, etc.)

## Common failure modes

| Symptom | Likely cause |
|---|---|
| `Login failed after 3 attempts` | Bad creds in `ask_maestro_env.json` or the env's login page is down |
| `Connect failed: 403` | `[ValidateAskMaestroAccess]` denied — user lacks `MaestroCoach` flag or org gate. `IsAskMaestroEnabledAsync` returns false. |
| `Connect failed: 500` | .NET orchestrator couldn't reach Python — check `_baseUrl` in `AskMaestroOrchestrator.cs` (hardcoded to `dgadev.ap.loclx.io`). If that tunnel is down, the deploy is effectively broken. |
| `Stream 200` but `event_count == 0` | Stream connected but no events — usually the message wasn't queued first, or the supervisor crashed silently. Check the JSONL log. |
| `tool.auth_rejected` event in stream | Python's MCP PAT is bad/expired (`MCP__PAT_TOKEN`). Rotate it server-side. Non-retryable. |
| `card.requires_input` then nothing | Forgot to call `resume` — the workflow paused waiting for input. Use `status` to see the pending interrupt. |
| `Upload failed: 413` | File > 30MB cap. The .NET filter `[RequestSizeLimit(30_000_000)]` rejects before forwarding. |
| `Resume failed: 422` | `interrupt_id` / `card_type` mismatch with what Python is expecting. Recheck the values from `card.requires_input.data`. |
| `unknown_events` populated | Python is emitting an event the skill's taxonomy doesn't know about. Update `KNOWN_EVENTS` in `ask_maestro_chat.py` or fix the Python side. |

## Cross-references

- **.NET controller**: `Degreed/trunk/Degreed.Web.vNext/Controllers/Api/AskMaestroController.cs`
- **.NET orchestrator**: `Degreed/trunk/Degreed.Common.Standard/Orchestrators/AskMaestroOrchestrator.cs`
  (hardcoded `_baseUrl = "https://dgadev.ap.loclx.io"` — restore the
  `AskMaestroRoutes.ConfigKey` lookup once SSM is wired)
- **.NET routes**: `Degreed/trunk/Degreed.Common.Standard/Constants/CoachAIBackendRoutes.cs` → `AskMaestroRoutes`
- **.NET request shape**: `Degreed/trunk/Degreed.Common.Standard/Models/DegreedAssistantParameters.cs` (`ConnectModel`)
- **Access filter**: `[ValidateAskMaestroAccess]` (gated on Maestro coach flag in Phase 1)
- **Python service**: `degreed-ask-maestro/` (NOT `degreed-coach-builder/`)
- **Python entrypoint**: `degreed-ask-maestro/src/ask_maestro/main.py`
- **Python event composer**: `degreed-ask-maestro/src/ask_maestro/streaming/events.py`
- **Python MCP client + PAT auth**: `degreed-ask-maestro/src/ask_maestro/mcp/{client,auth}.py`
- **Service demo runbook**: `degreed-ask-maestro/docs/DEMO.md`
- **Sibling test skills**: `test-degreed-assistant` (cookie+CSRF pattern donor),
  `test-coach-chat` (SSE pattern donor)
- **Archived prior version**: `.claude/skills/_archive/2026-05-23/test-ask-maestro/`
  (targets the defunct `/api/agent/*` v1 design — superseded)

## Limitations

1. **Python URL hardcoded.** `AskMaestroOrchestrator._baseUrl` is pinned to
   `https://dgadev.ap.loclx.io`. If that tunnel is unreachable the entire
   surface 500s. Confirm tunnel before declaring "Ask Maestro broken".
2. **Single-PR config.** The `pr2753` env is concrete. New PRs need a new env
   entry — copy the `pr2753` block, change the URL.
3. **No Playwright UI pass.** This skill verifies the API + SSE contract. UI
   testing of `/maestro/ask-maestro` lives in a future companion harness
   (per `feature-pipeline.md` § Live UI Verification).
4. **Cost guardrail scenarios omitted.** Forcing `cost.warning` and
   `cost.exceeded` requires server-side overlay flags that aren't wired yet —
   the user explicitly de-scoped the negative-path scenarios at skill
   generation time.
