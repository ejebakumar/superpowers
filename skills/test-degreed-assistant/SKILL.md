---
name: test-degreed-assistant
description: |
  E2E test the Degreed Assistant (DGA) quick-actions flow through the .NET
  /api/assistant/* surface. Mirrors how the web/mobile client drives the four
  DGA scopes (Curate pathway / Find skill-related content / Update your skills /
  Recommend content to my team) by calling Flows → Connect → Chat (SSE).
allowed-tools: [Bash, Read]
---

# Test Degreed Assistant (DGA)

Use this skill to test the **Degreed Assistant** end-to-end via the .NET proxy.
It exercises the same path the web/mobile clients use:

```
Browser/App → .NET /api/assistant/Connect (cookie+CSRF auth)
            → DegreedAssistantController.WithDgaRequestContext (injects cookies,
              host, userProfileKey, organizationId from claims+request)
            → DegreedAssistantOrchestrator.ConnectAsync
            → POST {python}/dgassistant/connect  (validates cookies, stores
              session in Redis, runs auth check, returns {status:true})
            → .NET /api/assistant/Chat?session_id=X
            → GET {python}/dgassistant/chat with X-Cookie + X-Host headers
            → SSE stream of LLM tokens
```

## CLI tool

`tools/dga-chat/dga_chat.py` — atomic verbs that map 1:1 onto the controller endpoints.

| Command | Maps to |
|---|---|
| `login --env <env>` | UI login (cookie+CSRF, stores `identity.v4`) |
| `flows` | `GET /api/assistant/Flows` |
| `connect "<query>" [--scope SCOPE]` | `POST /api/assistant/Connect` |
| `chat` | `GET /api/assistant/Chat?session_id={sid}` (SSE) |
| `ask "<query>" [--scope SCOPE]` | `connect` + `chat` in one call |
| `status` | dump local session state |
| `reset` | clear local session |

Session state is at `tools/dga-chat/.sessions/dga_chat_session.json`; full
request/response transcript at `tools/dga-chat/.sessions/dga_chat_log.json`.

## Valid scopes (Python ScopeEnum, strict)

- `Curate pathway`
- `Find skill-related content`   *(default)*
- `Update your skills`
- `Recommend content to my team`

These strings are the **wire values**. They must match exactly — the Python
validator rejects anything else with a 422.

## Environments

Defined in `tools/dga-chat/dga_chat_env.json`. Common targets:

- `pr54234` → `https://pr54234.degreed.dev` (current DGA test env)
- `staging` → `https://staging.degreed.com`
- `local`   → `https://localhost:44300`

Add a new PR env by appending an entry — same structure as `coach_chat_env.json`.

## Golden-path test

```bash
# 1. Authenticate (web cookie login)
python tools/dga-chat/dga_chat.py login --env pr54234

# 2. Confirm the user has DGA enabled and discover available flows
python tools/dga-chat/dga_chat.py flows
# → expect 200 with up to 4 entries (FlowId 1-4); `isActive` reflects per-scope flags

# 3. Trigger a quick-action — Find skill-related content
python tools/dga-chat/dga_chat.py connect "Find me content on Kubernetes networking" \
  --scope "Find skill-related content"
# → expect status:true. Server stored session in Redis and verified auth cookies.

# 4. Stream the LLM response
python tools/dga-chat/dga_chat.py chat
# → expect event_count > 0, non-empty answer.

# Convenience: connect + chat in one shot
python tools/dga-chat/dga_chat.py ask "Curate a pathway on system design" \
  --scope "Curate pathway"
```

## Validation checklist per run

The `chat` command emits a `validation` block:

- `has_events: true`  → SSE stream actually produced events
- `has_answer: true`  → at least one event carried `answer`/`text`/`content`

If `has_events` is true but `has_answer` is false, the model returned only
metadata (e.g. tool-only response) — inspect `first_event`/`last_event` in the
output to see what shape the stream used.

## Common failure modes

| Symptom | Likely cause |
|---|---|
| `Connect failed: 403` | DGA feature flag off OR user lacks any of the 4 quick-action permissions. Check `IsDegreedAssistantEnabledAsync` gate. |
| `Connect failed: 401` | Cookies expired — re-run `login`. |
| `Connect failed: 422` from Python | Scope string didn't match `ScopeEnum`. Use one of the four exact strings. |
| `Chat stream 401` | Session not found in Redis for that `session_id`. Run `connect` again — it stores the entry. |
| `Chat stream 200` but empty answer | LLM returned tool-only or metadata-only events. Inspect `first_event` in output. |
| `Connect failed: 500` with `Invalid Cookies` | `validate_auth_cookies` (calls back into .NET `getauthenticateduser`) failed — usually a host/cookie-domain mismatch. Check the env's `base_url`. |

## Cross-references

- .NET controller: `Degreed/trunk/Degreed.Web.vNext/Controllers/Api/DegreedAssistantController.cs`
- .NET orchestrator: `Degreed/trunk/Degreed.Common.Standard/Orchestrators/DegreedAssistantOrchestrator.cs`
- .NET request shape: `Degreed/trunk/Degreed.Common.Standard/Models/DegreedAssistantParameters.cs` (`ConnectModel`)
- .NET enrichment: `Degreed/trunk/Degreed.Web.vNext/Helpers/HttpRequestExtensions.cs` (`WithDgaRequestContext`)
- Python entrypoint: `degreed-assistant/backend/application.py` (`/connect`, `/chat`, `ScopeEnum`)
- Python routes constants: `Degreed/trunk/Degreed.Common.Standard/Constants/CoachAIBackendRoutes.cs` (`DegreedAssistantRoutes`)
