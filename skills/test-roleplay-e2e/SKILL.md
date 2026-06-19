---
name: test-roleplay-e2e
description: Use when testing a Maestro roleplay end-to-end over LiveKit voice — composing a single-persona roleplay, running a multi-minute spoken session with a simulated learner, and verifying post-processing inferences.
---

# Roleplay E2E Test Skill — Claude-Orchestrated

You are the orchestrator. The tool is a set of **atomic verbs** — never auto-chain them. Read the user's requirement, compose the roleplay, define the learner persona, run the session, post-process, and report.

Every command writes structured JSON to stdout and to a per-session folder at `tools/roleplay-e2e/.sessions/{session_id}/`. **All artifacts (state, transcripts, audio, MP4, inferences) are captured there** — nothing is ephemeral.

## When to Use

- "test the roleplay flow end to end"
- "create a roleplay where {scenario} and have a {N}-minute session"
- "run a 10-minute roleplay with a {persona}"
- "I want to see the full roleplay loop — creation, session, postprocess"

## Prerequisites

1. **Coach-builder venv active** — `source degreed-coach-builder/venv/bin/activate`
2. **`OPENAI_API_KEY`** present in shell env, `./.env`, or `degreed-coach-builder/.env` (tool resolves automatically)
3. **LiveKit agent worker** running for the Maestro RolePlayAgent
4. **Backend running** — .NET + Python for auth, builder API, call registration, post-processing
5. **(Optional) `ffmpeg`** on PATH for MP4 mux

## Hard Schema Rules (Roleplay model)

These are enforced by the staging API — don't fight them:

| Rule | Why |
|---|---|
| **Exactly ONE persona** | Roleplay supports a single persona. Multi-persona belongs to a different experience type. |
| **`personaVoiceId` is an int, not a string voice code** | The CLI maps `--persona "...|...|sage|..."` → `personaVoiceId=6` automatically. |
| **`duration` (minutes) is required** | Default is 10. Override with `--duration 15`. |
| **`skills` must be `[{tagId,tagName,sortOrder}]`** | Resolve skill names with `lookup-skill <term>` BEFORE composing. Don't guess tagIds. |
| **`feedbackRubrics` use the `levelDescriptions` key** (NOT `levels`) with 5 fixed levels (Poor / Needs Improvement / Acceptable / Good / Excellent). The CLI auto-populates the global 5-level `feedbackLevels` scale when rubrics are present but `feedbackLevels` is empty — override via `set-field feedbackLevels '[...]'` for a custom scale. | Claude authors the per-level descriptions; the scale is auto-populated unless overridden. |
| **`canProvideFeedback` flips to true automatically when rubrics are present** | The CLI's `_build_save_payload` defaults `canProvideFeedback=True` whenever `feedbackRubrics` is non-empty. Override with `set-field canProvideFeedback false` before save to keep rubrics persisted but feedback rendering hidden. |
| **`learnerInstructions`** ≠ `roleplayInstructions` | Instructions go to the persona-agent; learnerInstructions is what the human sees before the call. |

Valid voice codes on staging: `alloy ash ballad coral echo sage shimmer verse` (no nova/onyx/fable — those don't exist on Maestro).

## The Orchestrator Flow

### 1. Login

```bash
python tools/roleplay-e2e/roleplay_e2e.py login --env staging
```

Envs: `local`, `pr2103`, `staging`.

### 2. Resolve skills the user mentioned

If the user named skills (e.g. "active listening", "negotiation"), resolve them to tag IDs FIRST. Don't compose without real tag IDs.

```bash
python tools/roleplay-e2e/roleplay_e2e.py lookup-skill "active listening"
python tools/roleplay-e2e/roleplay_e2e.py lookup-skill "sales negotiation"
```

Pick the best matches from the returned list. Note the `tagId|tagName` pairs.

### 3. Author the feedback rubrics

**This is on you.** Don't use the lightweight `--rubric "Name|Desc"` form for real tests — it sends empty per-level descriptions. Author the full rubric JSON yourself, grounded in the scenario. Each rubric needs all 5 score levels with concrete, evaluable criteria.

Save it as a file in the session folder so the tool can read it cleanly:

```bash
cat > tools/roleplay-e2e/.sessions/_pending/rubrics.json <<'EOF'
{
  "rubrics": [
    {
      "name": "Handling Objections",
      "description": "Did the rep acknowledge the CFO's ROI skepticism and respond with concrete numbers?",
      "isQuantitative": true,
      "levelDescriptions": [
        {"score": 1, "levelName": "Poor",              "description": "- Dismissed or ignored objections\n- No acknowledgment of past SaaS pain\n- Used vague productivity claims under pressure"},
        {"score": 2, "levelName": "Needs Improvement", "description": "- Acknowledged objections shallowly\n- Reverted to generic ROI talk\n- Did not anchor in concrete numbers"},
        {"score": 3, "levelName": "Acceptable",        "description": "- Acknowledged the objection by name\n- Offered some numbers, but not tied to CFO's stated concerns"},
        {"score": 4, "levelName": "Good",              "description": "- Restated the objection accurately\n- Offered specific dollar/timeline figures\n- Connected the data back to the CFO's stated risk"},
        {"score": 5, "levelName": "Excellent",         "description": "- Reframed the objection as a shared problem\n- Anchored in measurable outcomes (payback period, headcount, time-saved)\n- Proactively addressed the SaaS-overrun backstory"}
      ]
    },
    {
      "name": "Closing the Pilot Ask",
      "description": "Did the rep guide the conversation toward a concrete 60-day pilot with go/no-go criteria?",
      "isQuantitative": true,
      "levelDescriptions": [
        {"score": 1, "levelName": "Poor",              "description": "- Never asked for the pilot\n- Ended without a next step"},
        {"score": 2, "levelName": "Needs Improvement", "description": "- Mentioned a pilot but did not define scope or duration"},
        {"score": 3, "levelName": "Acceptable",        "description": "- Asked for a pilot with duration but no success criteria"},
        {"score": 4, "levelName": "Good",              "description": "- Proposed pilot with duration and 1-2 success metrics\n- Suggested a decision date"},
        {"score": 5, "levelName": "Excellent",         "description": "- Proposed pilot with duration, measurable success criteria, defined budget, and go/no-go decision date\n- Got verbal commitment to the next meeting"}
      ]
    }
  ]
}
EOF
```

**Authoring rules for rubrics:**
- 2–4 rubrics per roleplay is the sweet spot (1 is thin, 5+ is noise)
- Each rubric name is a *skill being assessed*, not a generic dimension
- Each level description is **3–6 concrete behavioral indicators** (not a single line)
- Tie criteria to specifics in the scenario (numbers mentioned, the persona's backstory, the stated objection)
- The `Excellent` level should describe behavior that's hard but reachable, not utopian
- The `Poor` level should describe a real failure mode the learner could actually exhibit

### 4. Compose the roleplay

```bash
python tools/roleplay-e2e/roleplay_e2e.py compose \
  --name "Pitch to a Skeptical CFO" \
  --description "Practice defending ROI assumptions and timeline to a finance-first executive." \
  --instructions "You are Sarah Chen, the CFO of a 600-person SaaS company. A product manager (the learner) is pitching a \$400K AI developer-tooling pilot. You have read the deck. You are skeptical — past SaaS investments have overrun budget and underdelivered. Push hard on hard ROI (dollars saved, payback period), not vague productivity talk. You are open to a smaller pilot if the success criteria are concrete and measurable. Professional, direct, not hostile." \
  --learner-instructions "<p>You are pitching Sarah Chen, CFO. Goal: secure a 60-day pilot with measurable success criteria and a clear go/no-go date. She is skeptical — anchor everything in numbers.</p>" \
  --duration 10 \
  --persona "Sarah Chen|CFO|sage|Skeptical of AI ROI claims. Burned by past SaaS overruns. Will agree to a small pilot if metrics are concrete." \
  --skill "129071|Sales" \
  --skill "16462|Active Listening" \
  --rubric-json-file tools/roleplay-e2e/.sessions/_pending/rubrics.json \
  --can-end-conversation true \
  --can-recommend true
```

Read the stdout — confirm `persona`, `skills`, and `rubrics` are populated as expected before saving.

### 5. Save + publish

```bash
python tools/roleplay-e2e/roleplay_e2e.py save      # PUT /api/maestro/roleplay (Draft)
python tools/roleplay-e2e/roleplay_e2e.py publish   # PUT /api/maestro/roleplay (Published)
```

`save` returns `roleplay_id` and `personaId` (the server assigns these). Don't skip publish — registration of the LiveKit call requires `Published` state.

### 6. Start the conversation + register the call

```bash
python tools/roleplay-e2e/roleplay_e2e.py start-call
```

Single-persona roleplays use `POST /api/roleplay/registercall` and return `livekit_url`, `livekit_token`, `room`, and `conversation_id`.

### 7. Define the simulated-learner persona

This is what **the OpenAI Realtime voice agent will pretend to be** when it joins the room as the learner:

```bash
python tools/roleplay-e2e/roleplay_e2e.py set-learner-persona \
  --persona "You are Alex Rivera, a Product Manager with 4 years of experience. You're nervous but well-prepared. You have a \$400K pilot budget request. You speak conversationally — short sentences, occasional 'um', genuine reactions. When pushed on ROI, you reach for a specific example: a previous tool that saved 12 hours/week per engineer. You ask one clarifying question per turn. You do NOT abandon the pilot ask; you adapt it under pressure. End with [END_CONVERSATION] only when you've secured a clear yes/no on the pilot." \
  --voice alloy \
  --opener "Hi Sarah, thanks for making time. I'd like to walk you through the AI tooling pilot proposal — is now still a good time?"
```

**Authoring rules for the learner persona:**
- Name, role, experience level, emotional state, speaking style
- 1–2 specific facts/anecdotes they can reach for under pressure
- Their explicit goal for the conversation
- What they will and won't do (e.g. "won't lie about numbers, will adapt the ask")
- Under ~150 words — Realtime API works best with focused prompts
- Different voice from the agent so transcripts are distinguishable

### 8. Run the session

```bash
python tools/roleplay-e2e/roleplay_e2e.py run-session \
  --max-duration 600 \
  --min-duration 60 \
  --record \
  --mp4
```

- `--max-duration` hard cap in seconds (600 = 10 min)
- `--min-duration` prevents early exits even if agent goes silent
- `--record` writes per-track WAVs
- `--mp4` muxes mixed audio with a waveform visualization (requires ffmpeg)

The tool streams per-second progress to stderr. Final stdout JSON is the session summary.

**End reasons:** `max_duration` · `idle_timeout` · `goal_reached_sentinel` (learner emitted `[END_CONVERSATION]`) · `openai_ws_closed` · `livekit_disconnected`.

### 9. Inspect

```bash
python tools/roleplay-e2e/roleplay_e2e.py transcript
python tools/roleplay-e2e/roleplay_e2e.py events
```

If `agent_joined=false` after run-session, the LiveKit RolePlayAgent worker isn't running — flag that and stop.

### 10. Post-process

```bash
python tools/roleplay-e2e/roleplay_e2e.py end-conversation
python tools/roleplay-e2e/roleplay_e2e.py postprocess
python tools/roleplay-e2e/roleplay_e2e.py poll --timeout 180
python tools/roleplay-e2e/roleplay_e2e.py insights
```

`insights` writes `.sessions/{id}/insights.json` with feedback, summary, one-liner, tasks, recommendations, and Kirkpatrick L1–L4.

### 11. Export everything

```bash
python tools/roleplay-e2e/roleplay_e2e.py export
```

Writes `.sessions/{id}/everything.json` — one self-contained bundle: roleplay config, learner persona, conversation metadata, transcript, events, audio paths, MP4 path, post-process statuses, all insights.

## What Claude Authors vs What's Passed Through

| Thing | Who decides |
|---|---|
| Roleplay name, description, instructions, learnerInstructions | **Claude** (specific, grounded in the user's brief) |
| Single persona (name/jobRole/voiceCode/context) | **Claude** (pick a plausible name; voice ≠ learner's voice) |
| Duration | **User** (default 10 min) |
| Skills | **Claude** (resolve names → tagIds via `lookup-skill`, pick 1–3) |
| Feedback rubrics + per-level descriptions | **Claude** (2–4 rubrics, full 5-level descriptions, scenario-specific) |
| Feedback levels (Poor/NI/Acceptable/Good/Excellent) | **Default** unless user asks for a custom scale (use `--levels-json`) |
| Simulated learner system prompt + opener | **Claude** (the most important authoring step) |
| Recording / MP4 | Config defaults |
| Post-processing types polled | Config defaults |

## Reporting Back to the User

After `insights` + `export`, give a structured report:

```markdown
### Roleplay E2E — "{name}" (Roleplay #{id}, Conversation {conv_id})

**Setup**
- Scenario: {one-line}
- Persona: {name} ({jobRole}, voice {voiceCode}/id {voiceId})
- Duration target: {N} min
- Skills: {comma list}
- Rubrics: {comma list of names}

**Simulated Learner**
- {name} ({voiceCode}) — "{1-line summary of system prompt}"

**Session**
- Duration: {N}s ({mm:ss}) · End reason: {reason}
- Turns: agent {A} / learner {L}
- Audio: {mixed wav path} · MP4: {path or "skipped"}
- Artifacts: `tools/roleplay-e2e/.sessions/{id}/`

**Post-Processing**
| Inference | Status |
|---|---|
| RoleplayFeedback | {Success/Failure/Timeout} |
| ConversationSummary | … |
| ResourceRecommendations | … |
| KirkpatrickLevel1–4 | … |

**Insights**
- **One-liner:** {oneLiner}
- **Summary:** {2–3 sentence digest}
- **Rubric scores:**
  - {rubricName}: {score}/5 — {1-line reason}
- **Feedback highlights:** {3 bullets}
- **Tasks for the learner:** {bullet list}
- **Recommendations:** {N resources}

**Issues found**
- {agent_did_not_join | failed inferences | console errors}
```

If any inference is `Failure`/`Timeout`, say so explicitly — don't paper over it.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Save failed: 400 — PersonaName field is required` | You're sending camelCase keys; the tool already maps these — make sure you used `--persona "Name|Role|voice|context"`, not raw `set-field`. |
| `Save failed: 500 — personaJobRole: Input should be a valid string` | Missing job role in `--persona` (the second `|`-separated field). |
| `Register call failed: 403 Forbidden` | Roleplay not published, or user lacks Maestro permission on this org. Confirm `publish` succeeded and check the user's role. |
| `OPENAI_API_KEY not found` | Add to `degreed-coach-builder/.env` |
| `agent_did_not_join=true` | RolePlayAgent worker not running |
| Learner gives up too early | Add explicit "do NOT abandon the goal" clause |
| MP4 missing | ffmpeg not on PATH; WAV is still saved |
| Lookup-skill returns 0 items | Term not in tag taxonomy; try a synonym (e.g. "negotiation" instead of "deal making") |

## Files

- `tools/roleplay-e2e/roleplay_e2e.py` — atomic-verb CLI
- `tools/roleplay-e2e/voice_bridge.py` — LiveKit ↔ OpenAI Realtime bridge with recording
- `tools/roleplay-e2e/roleplay_e2e_env.json` — environments
- `tools/roleplay-e2e/roleplay_e2e_config.json` — timeouts, voice IDs, recording flags
- `tools/roleplay-e2e/.sessions/{session_id}/` — per-run artifacts (state, transcript, events, audio, mp4, insights, everything.json, rubric files)
