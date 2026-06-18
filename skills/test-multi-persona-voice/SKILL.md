---
name: test-multi-persona-voice
description: "Test multi-persona roleplay voice — choose Mode A / B / C via multiPersonaMode, verify persona handoffs, voice switching, data-channel events, and transcript attribution."
---

# Multi-Persona Voice Test Skill

Drive a multi-persona roleplay voice session through `tools/roleplay-e2e/roleplay_e2e.py`, **pick which topology runs** (Mode A / B / C) via the `multiPersonaMode` field on register-call, and verify the picked mode actually fired on the backend.

## When to Use

- User asks to **test multi-persona roleplay voice**
- User wants to **try Mode A (parallel realtime LLM per persona)**, **Mode B (STT-LLM-TTS pipeline)**, or **Mode C (inline-tag voice swap)**
- User wants to **verify persona handoff** between agents (floor.grant RPC for A, tool call for B, inline `<p:N>` tag for C)
- User wants to verify **`dg.session.mode`**, **`dg.persona.audio_started`**, **`dg.persona.handoff_*`**, or **`dg.persona.transcript_line`** data-channel events
- User mentions **multi-persona voice**, **persona voice switching**, **handoff timing**, or **active-tile UI sync**

## Mode Reference

| Mode value | Code path | Topology | Notes |
|---|---|---|---|
| `parallel_realtime` (A) | `multi_persona/parallel/` | N gpt-realtime agents, one LK participant per persona, RPC floor grants | Highest fidelity, highest cost; requires `agent-AJ_*` identity bookkeeping |
| `stt_llm_tts` (B) | `multi_persona/pipeline/` | Single STT-LLM-TTS pipeline (`gpt-5.5-2026-04-23` + per-Agent TTS), handoff via `@function_tool` | One LLM round-trip per handoff |
| `stt_llm_tagged` (C, default) | `multi_persona/pipeline_tagged/` | Single agent, inline `<p:N>` tags swallowed by custom `tts_node`, per-persona TTS instances | Sub-200ms voice swap |

Burn-in default in `entrypoint_dispatch.resolve_session_mode` is Mode C — if the test harness omits `--mode`, the session runs Mode C regardless of the roleplay metadata.

Operational kill-switch: env var `MULTI_PERSONA_MODE_OVERRIDE=parallel_realtime|stt_llm_tts|stt_llm_tagged` on the worker — wins over caller-supplied. Use only when forcing a mode across the fleet without redeploy.

## Prerequisites

1. **OpenAI key** -- `export OPENAI_API_KEY=sk-...` (only when this skill drives a simulated learner agent into the room)
2. **Coach-builder venv active** -- `source degreed-coach-builder/venv/bin/activate`
3. **Live PR env** (FE + .NET + Python all deployed) with the worker pool ready (`degreed-{env}-{pr}-agent`)
4. **Roleplay with ≥2 personas** — created via Studio or `roleplay_e2e.py compose ... --persona "..." --persona "..."`

## Setup

```bash
source degreed-coach-builder/venv/bin/activate
export OPENAI_API_KEY=sk-...
```

Tool: `tools/roleplay-e2e/roleplay_e2e.py` (canonical entry point for every command in this skill).

## Commands Reference

| Command | Description |
|---|---|
| `login --env <name>` | Authenticate (cookies + CSRF) |
| `load <roleplay_id>` | Load existing roleplay into local session cache |
| `set-field roleplayInstructions "<text>"` | Author the scenario brief Mode C reads first |
| `set-field personas '[{...}]'` | Replace the personas array (must already match real persona IDs) |
| `save` / `publish` | Persist edits via .NET, optionally publish |
| `start-call --mode {parallel_realtime\|stt_llm_tts\|stt_llm_tagged}` | Create conversation + register call with chosen topology |
| `run-session --max-duration N` | Dispatch a simulated learner agent into the room |
| `transcript` | Print the persisted ConversationMessages |
| `events` | Print the captured `dg.persona.*` data-channel events |
| `end-conversation` | Mark conv `Completed` (triggers RoleplayFeedback queue) |
| `postprocess` / `poll` / `insights` | Inspect post-processing |

## How to Test Each Mode

### Test 1 — Mode A (parallel realtime)

```bash
python tools/roleplay-e2e/roleplay_e2e.py login --env localstaging
python tools/roleplay-e2e/roleplay_e2e.py load 862
python tools/roleplay-e2e/roleplay_e2e.py start-call --mode parallel_realtime
# Expect: call_started, multi_persona_mode=parallel_realtime
python tools/roleplay-e2e/roleplay_e2e.py run-session --max-duration 60
python tools/roleplay-e2e/roleplay_e2e.py transcript
python tools/roleplay-e2e/roleplay_e2e.py events
```

**Backend verification (Datadog):**
```
service:(degreed-coach-builder OR degreed-coach-realtime) "{call_id}"
```
Look for:
- `[MULTI_PERSONA] entry session={call_id} mode=parallel_realtime ... is_primary=True` — entry resolved to Mode A
- `[MULTI_PERSONA] dispatch start agent_name={env}-agent ... secondaries=N-1`
- `[MULTI_PERSONA] dispatched persona={pid} ... dispatch_id=AD_*` — for every non-default persona
- `[MULTI_PERSONA] secondary fast-path persona_id={pid}` — secondary entrypoints fire
- `[MULTI_PERSONA] primary recorded secondary persona={pid} identity=agent-AJ_*` — `persona.ready` RPC landed (this is the **identity map** that fixes the floor-grant routing bug; missing this means handoffs will time out)
- On first handoff: a span/log under `request_handoff: rpc timeout to persona={pid} identity=agent-AJ_*` (failure) or **no error** + `dg.persona.handoff_complete` event (success)

### Test 2 — Mode B (STT-LLM-TTS pipeline)

```bash
python tools/roleplay-e2e/roleplay_e2e.py start-call --mode stt_llm_tts
python tools/roleplay-e2e/roleplay_e2e.py run-session --max-duration 60
```

Backend signals:
- `[MULTI_PERSONA] entry session=... mode=stt_llm_tts ... is_primary=True`
- One worker per session (not N). Look for `_run_pipeline` execution path.
- Handoff = `@function_tool handoff_to_persona` invoked by the LLM → new `Agent` returned → voice swap.

### Test 3 — Mode C (inline tags, default)

```bash
python tools/roleplay-e2e/roleplay_e2e.py start-call --mode stt_llm_tagged
# OR omit --mode entirely — Mode C is the burn-in default
python tools/roleplay-e2e/roleplay_e2e.py run-session --max-duration 60
```

Backend signals:
- `[MULTI_PERSONA] entry session=... mode=stt_llm_tagged ...`
- One worker, one Agent, custom `tts_node` parses `<p:N>` tags.
- `dg.persona.audio_started` fires on the first audio frame after each tag transition (the FE active-tile flip signal).

## Architecture: Mode Selection Flow

```
FE radio picker (RoleplayApproachStore)
    → registerCall body {... multiPersonaMode: "parallel_realtime" | ...}
    → .NET RoleplayRegisterRequest.MultiPersonaMode (pass-through)
    → POST /dgcb/api/realtime/register-roleplay-call
    → roleplay_metadata["multi_persona_mode"] (Redis, keyed by session_id)
    → LiveKit worker entrypoint fires
    → try_handle_multi_persona reads roleplay_metadata
    → resolve_session_mode(caller_supplied=...) picks A/B/C
    → _run_parallel_primary / _run_pipeline / _run_pipeline_tagged
```

Mode A only: the primary forwards `multi_persona_mode: "parallel_realtime"` into dispatch metadata for each secondary so secondaries resolve to the same topology.

## What to Verify (live)

| Check | How | Expected |
|---|---|---|
| Picked mode lands in entry log | Datadog: `"[MULTI_PERSONA] entry ... mode={picked}"` | Matches `--mode` value |
| Mode A: secondaries dispatched | Datadog: `[MULTI_PERSONA] dispatched persona=...` | One line per non-default persona |
| Mode A: secondary identity captured | Datadog: `[MULTI_PERSONA] primary recorded secondary ... identity=agent-AJ_*` | Real LK identity, not `persona-N` |
| Mode A: first handoff succeeds | Datadog absence of `rpc: floor.grant failed ... Connection timeout` | No timeout |
| Active tile flips on speak | `events` shows `dg.persona.audio_started` per persona transition | Tile flips align with audible voice |
| Persona attribution on transcript | `events` shows `dg.persona.transcript_line` with `persona_id` | Line attributed to the speaker |
| `dg.session.mode` participants list | `events` shows the publish with N participants | identity values are `agent-AJ_*` for Mode A, synthetic `persona-{id}` for Mode C |
| Handoff complete event | `events` shows `dg.persona.handoff_complete` | from_id → to_id matches the chain |
| ConversationMessages persisted | `transcript` after session ends | One row per persona-turn (not per audio chunk) |

## Data-Channel Event Contract (current)

All multi-persona modes use the `dg.persona.*` and `dg.session.*` topics. Older topics (`persona_switch`, free-form `transcript`) are obsolete.

### `dg.session.mode`
Published early (after mode resolves) AND re-published once the orchestrator finishes booting with the enriched participants list.
```json
{
  "mode": "parallel_realtime",
  "candidate_identity": "human-1332789-...",
  "participants": [
    {"identity": "agent-AJ_aBc...", "persona_id": 108, "name": "William", "role": "..."},
    ...
  ]
}
```

### `dg.persona.audio_started`
Fired on the FIRST AUDIO FRAME of every persona transition. Primary FE signal for the active-tile UI.
```json
{ "persona_id": 109 }
```

### `dg.persona.transcript_line`
Per-segment transcript fan-out (for FE chat-panel render).
```json
{ "persona_id": 109, "role": "assistant", "text": "...", "is_final": true, "seq": 42 }
```

### `dg.persona.handoff_started` / `dg.persona.handoff_complete` / `dg.persona.handoff_timeout` / `dg.persona.handoff_denied`
Mode A only — the orchestrator's floor FSM events. Mode C handoff is inline so it does NOT fire `handoff_started`.

### `dg.persona.active_changed`
Mirrors `audio_started` for downstream consumers that don't care about audio timing.

## Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/roleplay/registercall` | POST | Single endpoint for all multi-persona modes. The `multiPersonaMode` body field picks A/B/C. |
| `/api/roleplay/conversations` | POST | Create conversation (body: `{roleplayId}`) |
| `/api/roleplay/{id}` | GET | Get roleplay record (includes personas, scenario brief) |
| `/dgcb/api/realtime/register-roleplay-call` | POST | Python register receiver (called by .NET) |

There is no `/RegisterMultiPersonaCall` endpoint — that was an earlier design that was unified into `registercall`.

## Observation Report Format

```markdown
### Multi-Persona Voice Test — Mode {A|B|C}, Roleplay "{name}" (ID: {id})

**Call:** {call_id}  
**Conversation:** {conv_id}  
**Room:** {room_name}  
**Picked mode:** {multiPersonaMode value sent} → {mode resolved in entry log}

**Backend mode signals:**
- entry log `mode=`: {value}
- dispatch (Mode A only): {N secondaries dispatched / N/A}
- identity capture (Mode A only): {all N captured as agent-AJ_* / partial / none}

**Voice call:**
- Duration: {X}s, Turns: {N}
- Personas heard: {ordered list, e.g. William → Patricia → Andrew}
- Voice swap latency: {observed ms or "snappy" / "audible gap"}

**Data-channel events:**
| Topic | Count | Notes |
|---|---|---|
| dg.session.mode | {N} | early + enriched |
| dg.persona.audio_started | {N} | per persona transition |
| dg.persona.transcript_line | {N} | one per coalesced segment |
| dg.persona.handoff_complete (Mode A) | {N} | from→to chain |
| dg.persona.handoff_timeout (Mode A) | {N} | should be 0 |

**Persistence:**
- ConversationMessages rows: {N} (expected: 1 per persona-turn)
- save_chat_message 4xx/5xx: {none / list}

**Issues found:**
1. {issue}
```

## Troubleshooting

| Issue | Likely cause | Fix |
|---|---|---|
| Entry log shows `mode=stt_llm_tagged` despite `--mode parallel_realtime` | `multiPersonaMode` not in the register-call body — typically because `--mode` was set on a single-persona roleplay (≥2 personas required) OR worker has `MULTI_PERSONA_MODE_OVERRIDE` set | Verify `personas.length ≥ 2`; check worker env for the OVERRIDE kill-switch |
| Mode A: dispatch ok but `rpc: floor.grant failed to=persona-{id} Connection timeout` | Primary used the synthetic `persona-{id}` instead of the recorded `agent-AJ_*` identity from `persona.ready` | Fixed in `parallel/orchestrator.py:request_handoff` — confirm the deploy includes that fix |
| Mode A: no `persona.ready` ACK from any secondary | Worker pool empty OR `agent_name` mismatch between primary's dispatch and worker registration | Check `_resolve_agent_name()` matches `realtime.py` worker registration; confirm `num_idle_processes` warms enough workers |
| Mode A: secondaries respond with empty conversation context | Primary never broadcasts on the `transcript` data-channel topic OR no `conversation_item_added` listener on primary session | Fixed in `parallel/primary_agent.record_turn` + `_run_parallel_primary` `@session.on("conversation_item_added")` |
| Mode C: dead air after persona says "Patricia, over to you" | LLM didn't emit `<p:NNN>` tag in the same response — verbal handoff with no tag transition | Fixed by the MANDATORY inline-handoff directive in `pipeline_tagged/prompt._ORCHESTRATION` |
| ConversationMessages = N rows per persona turn (fragmented) | Persist was firing once per coalescer flush instead of per persona turn | Fixed in `pipeline_tagged/agent.tts_node` per-persona-turn persist buffer |
| `403 Site Disabled` on save_chat_message | The .NET PR env got disabled mid-call OR cookie expired | Re-login; redeploy / verify env URL |
| FE active tile doesn't flip on Mode A | `dg.session.mode.participants[].identity` had synthetic `persona-{id}` instead of `agent-AJ_*` | Fixed in `ParallelRealtimeOrchestrator.start()` participants list build |
