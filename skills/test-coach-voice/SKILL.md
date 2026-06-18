---
name: test-coach-voice
description: Drive a full end-to-end coach voice test as the orchestrator — load an existing coach, dispatch an OpenAI Realtime voice agent into the LiveKit room as the simulated learner, run a multi-minute conversation, then trigger post-processing and surface all coach inferences (summary, feedback, recommendations, TaskItems, BehaviorPatterns, Agenda, UserLearningPreferences, KirkpatrickEvaluation, ConversationContext, Progress) as insights. Activates when the user says "test coach voice", "have a voice conversation with the coach", "run a coach voice session", or similar.
---

# Coach Voice E2E Test Skill — Claude-Orchestrated

You are the orchestrator. The tool is a set of **atomic verbs** — never auto-chain them. Load the coach, define the simulated-learner persona, run the session, post-process, report.

Every command writes structured JSON to stdout and to a per-session folder at `tools/coach-voice/.sessions/{session_id}/`. **All artifacts (state, transcripts, audio, MP4, inferences) are captured there** — nothing is ephemeral.

This skill is a sibling of `test-roleplay-e2e` — same verb model, same shared `voice_bridge.py`, swap "roleplay" for "coach". Use `test-coach-create` first if the coach doesn't exist yet.

## When to Use

- "test the coach voice flow end to end"
- "have a {N}-minute voice conversation with coach {id}"
- "run a voice session against coach X"
- "I want to verify post-processing on a coach voice call"

## Prerequisites

1. **Coach-builder venv active** — `source degreed-coach-builder/venv/bin/activate`
2. **`OPENAI_API_KEY`** in shell env, `./.env`, or `degreed-coach-builder/.env` (tool resolves automatically)
3. **LiveKit Maestro coach agent worker** running and accepting jobs
4. **Backend running** — .NET + Python for auth, conversation create, registercall, post-processing
5. **A published coach** — create one via `test-coach-create` first, or use an existing `coach_id`
6. **(Optional) `ffmpeg`** on PATH for MP4 mux

## Hard Rules

| Rule | Why |
|---|---|
| **Coach speaks first** | The Maestro coach agent delivers the greeting. The simulated learner should NOT send an opener — leave `--opener ""`. OpenAI Realtime's server VAD auto-responds when the coach finishes its turn. |
| **`--voice` is the LEARNER's voice (OpenAI Realtime)** | The coach's own voice was set when the coach was built. Pick a learner voice different from the coach's so transcripts are distinguishable. |
| **24 kHz end-to-end** | `registercall` declares `sampleRate: 24000`. The bridge publishes at 24 kHz to match. Don't change this unless the server contract changes. |
| **Model defaults to `gpt-realtime`** | GA model, uses the new `audio.input/output` schema, no `OpenAI-Beta` header. Override in `coach_voice_config.json` if needed. |
| **End-of-conversation triggers post-processing** | `PUT /api/coach/v1/conversations/updatepartial` is the canonical end + trigger. There is no separate postprocess endpoint to call. |

Valid learner voice codes: `alloy ash ballad coral echo sage shimmer verse` (no nova/onyx/fable on Maestro).

## The Orchestrator Flow

### 1. Login

```bash
python tools/coach-voice/coach_voice.py login --env staging
```

Envs: `local`, `pr2103`, `pr54234`, `staging`. Add new envs to `coach_voice_env.json`.

### 2. Load the coach

```bash
python tools/coach-voice/coach_voice.py load 25703
```

Returns coach name, state, conversation mode. If `has_voice: false`, the coach is text-only — flag and stop. (Rebuild via `test-coach-create` with `conversationMode: Both` or `Voice`.)

### 3. Start the conversation + register the call

```bash
python tools/coach-voice/coach_voice.py start-call
```

Two server calls in one verb:
1. `POST /api/coach/conversations/create` → returns `conversationId`
2. `POST /api/coach/registercall` with `{sampleRate:24000, timeZone, userId, coachId, agentType:"coach", conversationId, enableLiveTranscript:true}` → returns `accessToken` + `socketUrl` + room (decoded from JWT)

Output exposes `livekit_url`, `room`, `has_token`. If `has_token: false`, the register failed — read the error and stop.

### 4. Define the simulated-learner persona

This is the OpenAI Realtime agent pretending to be the human user. Author it from the user's intent:

```bash
python tools/coach-voice/coach_voice.py set-learner-persona \
  --persona "You are a B2B SaaS founder talking to the Pricing Strategy Advisor. You run a 84-customer SaaS doing \$180K MRR on flat \$2,200/mo. Your biggest customer pays the same as your smallest, which feels wrong. You want help moving to tiered pricing without losing your small-customer base. Speak conversationally — short sentences, occasional 'um'. Wait for the coach to greet you first. Ask one real question per turn. Give numbers when you have them. When the coach challenges your cost-plus instinct, push back once but then engage. End with [END_CONVERSATION] only after you've gotten 2-3 concrete next steps you'd actually do this week." \
  --voice alloy \
  --opener ""
```

**Authoring rules for the learner persona:**
- Name, role, situation, emotional state, speaking style
- 1–2 specific facts they can reach for under pressure (numbers, customer details, prior context)
- Their explicit goal for the conversation
- What they will and won't do (e.g. "won't lie about numbers, will push back once on bad advice")
- **`--opener ""` (empty)** — coach speaks first. Setting an opener will force the learner to talk over the coach.
- Use a **different voice** from the coach's voice so transcripts are distinguishable
- Keep under ~150 words — Realtime API works best with focused prompts

### 5. Run the session

```bash
python tools/coach-voice/coach_voice.py run-session \
  --max-duration 600 \
  --min-duration 30 \
  --record \
  --mp4
```

- `--max-duration` hard cap in seconds (600 = 10 min)
- `--min-duration` prevents early exits even if the coach pauses
- `--record` writes 3 per-track WAVs (agent / learner / mixed)
- `--mp4` muxes mixed audio with waveform visualization (requires ffmpeg)

Progress streams to stderr as one JSON line per 2 s. **`published_kb` is the audio our bridge has pushed into the room** — if it stays at 0 while the coach is talking, the LiveKit publish is broken; if it climbs but the coach hears silence, the issue is on the server's subscribe side.

End reasons: `max_duration` · `idle_timeout` · `goal_reached_sentinel` (learner emitted `[END_CONVERSATION]`) · `openai_ws_closed` · `livekit_disconnected`.

### 6. Inspect what happened

```bash
python tools/coach-voice/coach_voice.py transcript     # full timeline
python tools/coach-voice/coach_voice.py events         # data-channel + lifecycle events
```

If `agent_joined: false` in the session result, the LiveKit coach worker isn't running — flag and stop. Don't pretend post-processing will return useful insights from a one-sided conversation.

### 7. End the conversation + trigger post-processing

```bash
python tools/coach-voice/coach_voice.py end-conversation
```

`PUT /api/coach/v1/conversations/updatepartial` returns a `requestId` for polling. **This same call IS the post-process trigger** — there's no separate postprocess endpoint. (The `postprocess` verb exists as a convenience alias that just checks the request_id is set.)

### 8. Poll all inference types

```bash
python tools/coach-voice/coach_voice.py poll --timeout 120
```

Polls these 10 types in parallel:

| Type | What it captures |
|---|---|
| ConversationSummary | Human-readable conversation digest |
| Recommendations | Resource recommendations (content, mentors, pathways) |
| Feedback | Coach-side feedback inference |
| TaskItems | Action items for the learner |
| BehaviorPatterns | Behavioral observations |
| Agenda | Topics covered + topics deferred |
| UserLearningPreferences | Learning-style/preference signals |
| KirkpatrickEvaluation | Reaction / Learning / Behavior / Results |
| ConversationContext | Context the learner provided |
| Progress | Where the learner is in their journey |

Each returns `Pending` → `Success` / `Failure` / `Timeout`. **Don't gloss over `Failure`** — name the type and surface the server message.

### 9. Fetch all insights + save

```bash
python tools/coach-voice/coach_voice.py insights
```

Hits these endpoints in parallel, parses, writes `.sessions/{id}/insights.json`:

- `GET /api/coach/summaries/conversation/{cid}` — summary text under **`summaryText`** (not `summary`)
- `GET /api/coach/recommendations/conversation/{cid}` — `inputs`, `pathways`, `targets`, `mentors`, `quizzes`, `coaches`, `roleplays`
- `GET /api/coach/inferences/userfeedback?conversationId=X&coachId=Y` — user feedback (separate from `Feedback` inference)
- `GET /api/coach/inferences/conversation/{cid}` — **list** of all inferences (each with `inferenceType` + JSON-string `inferredData`)
- `GET /api/coach/{coachId}/conversations/{cid}` — full conversation envelope (embedded inferences, message count, metadata)

### 10. Export everything

```bash
python tools/coach-voice/coach_voice.py export
```

Writes `.sessions/{id}/everything.json` — one self-contained bundle:

```json
{
  "session_id": "...", "env": "...", "user": "...",
  "coach": { "id": 25703, "name": "...", "conversation_mode": "Both" },
  "learner_persona": { "voice": "alloy", "persona": "...", "opener": "" },
  "conversation": { "id": 143886, "livekit": { "url": "...", "room": "...", "endpoint": "/api/coach/registercall" } },
  "session_result": { "duration_s": 247, "end_reason": "max_duration", "agent_joined": true, "learner_turns": 4, "artifacts": {...} },
  "transcript": [...], "events": [...],
  "post_process": { "request_id": "...", "statuses": { "ConversationSummary": "Success", ... } },
  "insights": { "summary": {...}, "recommendations": {...}, "user_feedback": {...}, "inferences": [...], "conversation": {...} }
}
```

## Reporting Back to the User

```markdown
### Coach Voice E2E — "{coach_name}" (Coach #{id}, Conversation {conv_id})

**Setup**
- Coach: {name} — {conversation_mode} mode
- Simulated Learner: voice {alloy}, persona "{1-line summary}"
- Duration target: {N} min · Env: {pr54234|staging}

**Session**
- Duration: {N}s ({mm:ss}) · End reason: {reason}
- Agent joined: {yes/no} · Learner turns: {N} · Transcript: {N} entries
- Audio: `audio_mixed.wav` · MP4: `{path or "skipped — no ffmpeg"}`
- Errors: {none / list}

**Post-Processing (10 types)**
| Inference | Status |
|---|---|
| ConversationSummary | Success/Failure/Timeout |
| Recommendations | … |
| Feedback | … |
| TaskItems | … |
| BehaviorPatterns | … |
| Agenda | … |
| UserLearningPreferences | … |
| KirkpatrickEvaluation | … |
| ConversationContext | … |
| Progress | … |

**Insights**
- **Summary** ({N} chars): {2-3 sentence quote from the actual summary}
- **TaskItems:** {bulleted list of action items}
- **Recommendations:** {N inputs, N targets, N mentors} — top 3 titles
- **KirkpatrickEvaluation:** L1 reaction, L2 learning gist
- **Feedback:** {1-line coach observation}

**Issues found**
- {agent_did_not_join | failed inferences | console errors | any}
```

If any inference came back `Failure` or `Timeout`, name it with the request_id — don't paper over it.

## What Claude Authors vs What's Loaded

| Thing | Who decides |
|---|---|
| The coach itself (name, instructions, persona, KB) | **Built by `test-coach-create`** — `coach-voice` only consumes existing coaches |
| Simulated learner persona + voice | **Claude** (this is the only authoring step here) |
| Duration | **User** (default 10 min) |
| Recording / MP4 | Config defaults unless user overrides |
| Post-processing types polled | Config defaults (all 10 canonical coach types) |

## Configuration

### Environments (`coach_voice_env.json`)

| Env | URL |
|---|---|
| local | https://localhost:44300 |
| pr2103 | https://lxpfepr2103.degreed.dev |
| pr54234 | https://pr54234.degreed.dev |
| staging | https://staging.degreed.com |

### Settings (`coach_voice_config.json`)

| Key | Default | Description |
|---|---|---|
| `openai_realtime_model` | `gpt-realtime` | GA model; bridge auto-detects v1-beta vs GA schema |
| `openai_voice` | `alloy` | Default learner voice (override per-call with `--voice`) |
| `vad_silence_ms` | 900 | Silence ms to trigger end-of-speech |
| `vad_threshold` | 0.55 | Server VAD threshold |
| `default_max_duration` | 600 | 10 min cap on `run-session` |
| `default_min_duration` | 30 | Min seconds before idle-timeout can fire |
| `post_process_timeout` | 180 | Max seconds for `poll` |
| `record_audio` | true | Write per-track WAVs |
| `encode_mp4` | true | Mux mixed WAV → MP4 (no-op if ffmpeg missing) |
| `post_process_event_types` | 10 types | The list `poll` checks |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Coach load failed: 404` | Wrong `coach_id` for the env; double-check it exists |
| `has_voice: false` after load | Coach is text-only — rebuild via `test-coach-create` with voice enabled |
| `Register call failed on all candidates` | Server endpoint moved; check the network tab of a real coach voice session in the browser and add the new path to `start-call` candidates |
| `OPENAI_API_KEY not found` | Add to `degreed-coach-builder/.env` |
| `agent_joined=false` after run-session | Maestro coach LiveKit worker not running — restart it |
| Learner talks over the coach | You set `--opener` — clear it (`--opener ""`); coach speaks first |
| Learner sounds robotic / generic | Tighten the persona: name, specific anecdote, emotional state, explicit goal |
| Session ends with `openai_ws_closed` mid-response | Transient OpenAI rate-limit (try again) or hit the keepalive bug — bridge already disables client pings, so retry usually works |
| MP4 missing | `ffmpeg` not on PATH; WAV is still saved |
| All 10 polls `Success` but `insights` summary preview is empty | API shape changed — your data IS in `insights.json` even if the brief output extractor misses it. Open `tools/coach-voice/.sessions/{id}/insights.json` directly to inspect. |

## Files

- `tools/coach-voice/coach_voice.py` — atomic-verb CLI (the canonical orchestrator described above)
- `tools/_shared/voice_bridge.py` — shared LiveKit ↔ OpenAI Realtime bridge (also used by `test-roleplay-e2e`)
- `tools/coach-voice/coach_voice_env.json` — environments
- `tools/coach-voice/coach_voice_config.json` — voice IDs, recording flags, post-process types, plus TTS/STT/repetition-detection knobs used by the scripted scenarios below
- `tools/coach-voice/.sessions/{session_id}/` — per-run artifacts (state, transcript, events, 3 WAVs, optional MP4, insights, everything.json)

### Sibling Scripts — Scripted Bug-Repro Mode

These are standalone scripts (NOT part of the `coach_voice.py` verb model). They reproduce specific production bugs and use the same `coach_voice_env.json` for login. Run from the workspace root with the coach-builder venv active.

| Script | Purpose | Tickets |
|---|---|---|
| `tools/coach-voice/voice_scenario_runner.py` | Scripted-scenario voice runner: joins LiveKit as a synthetic learner via OpenAI TTS, executes ops from `scenarios/*.json` (`wait_for_agent_speech_started`, `user_say`, `capture_agent_transcript_so_far`, `evaluate`), detects repetition + re-greeting. `run <name>` / `run-all`. | 4878 · 4621 · 4719 · 4982 |
| `tools/coach-voice/voice_interrupt_runner.py` | Standalone (no session_state) interruption tester: own login + register + LiveKit + stereo MP4 mux. Scenarios baked in: `intro_one_word`, `intro_meaningful`, `midconv_ok`, `midconv_thanks`, `midconv_perfect`. | 4878 · 4719 |
| `tools/coach-voice/comprehensive_test.py` | 8-scenario text-mode validation suite (T1–T8) for side-by-side `--env pr-with-fix` vs `--env pr-without-fix` comparisons. Brand-new user, returning user with `previousMessages`, mid-conv normal, session_id rotation, rapid interruption, one-word follow-ups, 10-turn long convo, brand-new coach. | 4778 · 4719 |
| `tools/coach-voice/race_test.py` | Race-condition reproducer: fires `event=connect` (proactive intro) and `event=chat` (follow-up) concurrently to check whether the chat handler's `retrieve_chat` beats the intro's Redis store and triggers the MANDATORY GREETING. | 4778 |
| `tools/coach-voice/race_test_chat.py` | Same idea but chat-vs-chat: N consecutive `event=chat` turns fired with small delay so each interrupts the previous mid-stream. | 4778 |
| `tools/coach-voice/fix_verification.py` | Direct verification of the AIDATASCI-4778 fix — sends an explicit `previousMessages` payload (which `coach-chat.py` doesn't), asserts no full self-introduction. | 4778 |
| `tools/coach-voice/fix_verification_brand_new.py` | Regression check: brand-new user (no `previousMessages`) must STILL get a full intro. Verdict `REGRESSION_NO_INTRODUCTION` if the welcome flow disappeared. | 4778 |
| `tools/coach-voice/scenarios/*.json` | 28 scripted scenarios consumed by `voice_scenario_runner.py`: `interrupt_first_response*`, `interrupt_mid_conversation`, `interrupt_then_silence`, `interrupt_with_question`, `baseline_no_interrupt`, `long_voice_no_drift`, `cross_modality_rejoin`, `aidatasci_4982_text_meta_to_voice`, `voice_one_word_interrupt`, `voice_okay_followup`, `voice_idk_followup`, `voice_consecutive_shorts`, `roleplay_*`, `skills_*`, `test*_text_to_voice`, etc. | mixed |

**When to use scripted mode vs the orchestrator:**
- Use `coach_voice.py` (the orchestrator above) for free-form multi-minute conversations with a Claude-authored simulated-learner persona, post-processing, and inference verification.
- Use `voice_scenario_runner.py` / `voice_interrupt_runner.py` / the text-mode scripts for **deterministic bug-repro** when you need exact interruption timing or precise text payloads (e.g. `previousMessages` injection).

Each scripted-mode run writes artifacts to `tools/coach-voice/.sessions/artifacts/<scenario>_<ts>/`: `transcript.jsonl`, `captures.json`, `agent_audio.wav`, `agent_audio_whisper.txt` (post-hoc Whisper), and (for `voice_interrupt_runner`) `session_stereo.wav` + `session.mp4` (coach=L, learner=R, timeline-aligned).

## Related Skills

- **`test-coach-create`** — build the coach first (chat → generate → save → publish). Use BEFORE this skill if no coach exists.
- **`test-coach-chat`** — text-only conversation against the same coach. Same post-process pipeline (`PUT /api/coach/v1/conversations/updatepartial`).
- **`test-roleplay-e2e`** — sibling skill for roleplays; shares `voice_bridge.py`. Roleplay differs: single persona is part of the *experience* (not the learner), feedback uses scored rubrics, only 2 post-process types (`RoleplayFeedback`, `Recommendations`).
