---
name: test-translate-experience
description: Use when testing Maestro's Multilingual v1 translation pipeline live — firing per-language translation jobs on a Coach, Quiz, or Roleplay and verifying TranslationStatus transitions, .NET callbacks, and Datadog traces.
---

# Translation Service Engine Test Skill (multilingual-maestro-v1)

Drive the full Multilingual Maestro v1 translation loop through real APIs, watch per-language `TranslationStatus` transitions, and verify correctness in Datadog.

End-to-end flow:

```
UI (us) ─POST /api/maestro/{Type}/{id}/languages──▶ .NET MaestroStudioController
                                                     │
                                                     ▼
                                      MaestroLanguageOrchestrator.AddLanguagesAsync
                                       1. Loads / lazily creates source ExperienceLocalization row.
                                       2. INSERT N ExperienceLocalizations rows (TranslationStatus=Translating).
                                       3. POST  /dgcb/api/v1/maestro_studio/translate-experience
                                          body  MaestroTranslationRequest (sourceFields, cookies, host, ids).
                                                     │
                                                     ▼ (Python)
                                      setup_session_data() stores forwarded cookies in Redis
                                      Background TranslationPipeline:
                                         per target language:
                                           LLMTranslationProvider.translate_batch(...)
                                           POST /api/maestro/experience/{Type}/translations
                                                body MaestroTranslationCallbackRequest
                                                     (cookie-auth via degreed_api.request)
                                                     │
                                                     ▼ (.NET)
                                      MaestroLanguageOrchestrator.AddTranslationsAsync
                                       - Success: insert ExperienceLocalizationFields rows + status=AutoTranslated.
                                       - Failure: status=Failure, no field rows.
                                                     │
                                                     ▼
                                      GET /api/maestro/{Type}/{id}/languages
                                       UI polls this; the CLI's auto-poll watches translationStatus.
```

There are **no per-progress updates** — one terminal callback per language.

## When to Use

- User says "test the translation engine", "smoke-test multilingual maestro", "verify the languages endpoint", "check the translation callback lands".
- User gives a scenario like "translate coach 881 into Spanish and French".
- User wants to verify a fix in the orchestrator chain, the Python pipeline, or the LLM provider.

## Setup

All files live in `tools/translate-test/`:

| File | Purpose |
|------|---------|
| `translate_test.py` | Main CLI |
| `translate_test_env.json` | Environments (`pr54743`, `pr54648`, `local`, `staging`) |
| `translate_test_config.json` | Defaults — poll interval, timeout, default language list |
| `.sessions/` | Per-env session state (gitignored) |
| `README.md` | Standalone usage docs |

Activate the Python venv before every command:

```bash
source degreed-coach-builder/venv/bin/activate
```

## Available commands

### 1. Login (required first)

```bash
python tools/translate-test/translate_test.py login --env pr54743
```

| env       | UI (.NET)                          | Python                                          |
|-----------|------------------------------------|-------------------------------------------------|
| `pr54743` | https://pr54743.degreed.dev        | https://pr-948.dgcoachbuilder-api.degreed.dev   |
| `pr54648` | https://pr54648.degreed.dev (v2 legacy) | https://pr-948.dgcoachbuilder-api.degreed.dev |
| `local`   | https://localhost:44300            | http://localhost:8000                           |
| `staging` | https://staging.degreed.com        | staging Python URL                              |

### 2. Fire a translation job (E2E)

```bash
python tools/translate-test/translate_test.py translate \
    --type coach --id 881 --langs es,fr
```

- `--type`: `coach` | `quiz` | `roleplay` (lowercased; the CLI sends `Coach` to .NET).
- `--id`: numeric experience ID.
- `--langs`: comma-separated **short BCP-47 codes** (e.g. `es,fr,ko,nl`). Max 10.
- `--no-poll`: skip auto-polling; print the response rows and exit.

Sends `POST /api/maestro/{Type}/{id}/languages` with `{ "languages": [...] }`.
Returns `202 Accepted` with a `List<ExperienceLanguageResponse>` (one row per language, initial `translationStatus=Translating`).
Then auto-polls `GET /api/maestro/{Type}/{id}/languages` every 2 s and prints a live table until every row reaches a **terminal** status:

| Terminal status | Meaning |
|---|---|
| `Source` | This row is the source language (no translation needed). |
| `AutoTranslated` | Python returned success; field rows landed in `aicoach.ExperienceLocalizationFields`. |
| `ManuallyEdited` | Admin saved an edit on top of an auto-translated value. |
| `Failure` | Python returned status=Failure OR the callback never landed (row stays in Translating beyond the test timeout). |

### 3. Poll an existing coach manually

```bash
python tools/translate-test/translate_test.py poll 881 --langs es,fr
```

Polls the same `GET .../languages` endpoint until those languages reach terminal status. Useful when the prior `translate` call hit a 500 mid-flight and you want to wait for any stuck rows to resolve.

### 4. Session helpers

```bash
python tools/translate-test/translate_test.py status   # show last login + last translate call
python tools/translate-test/translate_test.py reset    # clear .sessions/
```

## How to run a scenario

When the user says *"translate coach 881 into Spanish and French and verify the callback lands"*:

1. **Reset + login** to the right env:
   ```bash
   python tools/translate-test/translate_test.py reset
   python tools/translate-test/translate_test.py login --env pr54743
   ```

2. **Pick the coach + languages** the user named. If they didn't name one, search the user's published coaches via the existing `/api/maestro/Experiences` POST endpoint and pick a Coach — never invent IDs.

3. **Fire the translation**:
   ```bash
   python tools/translate-test/translate_test.py translate --type coach --id 881 --langs es,fr
   ```
   Read the live progress table. Translation typically completes in **8–30 s per language**.

4. **If anything stays `Translating` past ~60 s**, the callback hasn't landed. Go to **Common Failure Modes** below.

5. **Verify in Datadog** (see next section). Mandatory after every test.

6. **Report findings** using the **Observation Report** template at the bottom.

## Datadog verification (MANDATORY after every test)

Datadog is the source of truth for what happened inside Python AND whether the callback was received by .NET. The CLI only sees what's in the DB at poll time — it can't tell you *why* a row is stuck.

### Datadog MCP tools

Configured in `.mcp.json`. Relevant tools:

```
mcp__datadog-mcp__search_datadog_spans       — query traces by service/operation
mcp__datadog-mcp__search_datadog_logs        — query stdout/stderr logs
mcp__datadog-mcp__get_datadog_trace          — fetch a full trace by trace_id
mcp__datadog-mcp__aggregate_spans            — count errors / latency percentiles
mcp__datadog-mcp__load_datadog_skill         — load `datadog/traces` skill first
```

Before running any Datadog queries, **load the trace skill** (mandatory per the Datadog MCP guidance):

```
mcp__datadog-mcp__load_datadog_skill(skill_name="datadog/traces")
```

### Service + environment filters

| Layer | Datadog service | Env (PR-env smoke) | Env (production) |
|-------|-----------------|--------------------|--------------------|
| Python (Maestro) | `service:degreed-coach-builder` | `env:pr-948-localstaging` | `env:production` |
| .NET (Degreed) | `service:degreed.web.next` | `env:pr54743` | `env:production` |

### Key spans (Python side, in pipeline order)

| Order | Span | Confirms |
|-------|------|----------|
| 1 | `dd_trace.translate_experience` | HTTP entry — `/api/v1/maestro_studio/translate-experience` accepted (status 202). |
| 2 | `translation.background_pipeline` | Background thread span — joins the request trace via ddtrace carrier. |
| 3 | `dd_trace.translation_pipeline.run` | Pipeline started. |
| 4 | `dd_trace.translation.translate_batch` | LLM call (one per language). |
| 5 | `dd_trace.degreed_api_service.request` | Outbound POST to .NET `/api/maestro/experience/{Type}/translations`. |
| 6 (.NET) | `POST /api/maestro/experience/{type}/translations` | .NET received the callback (look on `service:degreed.web.next`). |

### Query templates

**Find every span for a specific run (after you have a Python trace_id):**

```
mcp__datadog-mcp__search_datadog_spans(
  query='service:degreed-coach-builder env:pr-948-localstaging trace_id:<TRACE_ID>',
  from='now-30m'
)
```

**Find pipeline spawns (`translate-experience: spawned pipeline for ...`):**

```
mcp__datadog-mcp__search_datadog_logs(
  query='service:degreed-coach-builder env:pr-948-localstaging "spawned pipeline"',
  from='now-30m'
)
```

**Per-language outbound callback log line (Python side, success):**

```
mcp__datadog-mcp__search_datadog_logs(
  query='service:degreed-coach-builder env:pr-948-localstaging "translation callback OK"',
  from='now-15m'
)
```

Sample:
```
translation callback OK: Coach#881/es status=Success
```

**Callback failed on Python side (logged once per failed attempt):**

```
mcp__datadog-mcp__search_datadog_logs(
  query='service:degreed-coach-builder env:pr-948-localstaging "translation callback failed"',
  from='now-30m'
)
```

**.NET received the callback (confirms request hit the endpoint):**

```
mcp__datadog-mcp__search_datadog_spans(
  query='service:degreed.web.next env:pr54743 resource_name:"POST /api/maestro/experience/{type}/translations"',
  from='now-30m'
)
```

**Token-usage consolidation per language (one event per language):**

```
mcp__datadog-mcp__search_datadog_logs(
  query='service:degreed-coach-builder env:pr-948-localstaging "LLMService.save_usage"',
  from='now-15m'
)
```

Sample (one line per language after the consolidation fix):
```
LLMService.save_usage: 1 calls, 5415 total tokens, event=translate_coach_es [organization_id=1]
```

### Healthy latency baseline

For a Coach with ~5–10 short string fields, 2 languages:

| Span | Healthy range |
|---|---|
| `dd_trace.translate_experience` (HTTP entry) | < 500 ms (just spawns the thread) |
| `dd_trace.translation.translate_batch` per language | 5–15 s |
| End-to-end per language (POST → terminal status visible in DB) | 8–25 s |

If a language stays `Translating` past **60 s**, treat it as stuck — go to the failure-mode guide.

## Common failure modes — debug recipes

### A. Row stays `Translating` forever, no callback OK log

**Likely cause:** Python pipeline ran but the cookie-authed POST back to .NET failed (401), or the row insert succeeded on .NET but the .NET → Python POST never happened (.NET 500).

**Datadog check 1 — did Python even start the pipeline?**
```
mcp__datadog-mcp__search_datadog_logs(
  query='service:degreed-coach-builder env:pr-948-localstaging "spawned pipeline"',
  from='now-30m'
)
```
If no log: the .NET → Python POST never reached Python. Check the .NET orchestrator log: `Failed to request translation for {Type} {EntityId}` and look at the inner exception — most likely the X-Internal-Key mismatch between Python's `MaestroInternalApiKey` and .NET's.

If log present: Python ran. Move on.

**Datadog check 2 — did Python's callback fail?**
```
mcp__datadog-mcp__search_datadog_logs(
  query='service:degreed-coach-builder env:pr-948-localstaging "translation callback failed"',
  from='now-30m'
)
```
If 401: the forwarded cookies expired between login and callback, OR `setup_session_data` didn't persist them. Verify the request body that .NET sent had `cookies` populated.

### B. `Translating` → `Failure` immediately

**Likely cause:** Python returned `status:"Failure"` for the language. Either the LLM call failed or `sourceFields` was empty.

**Datadog check:**
```
mcp__datadog-mcp__search_datadog_logs(
  query='service:degreed-coach-builder env:pr-948-localstaging ("produced empty translation" OR "translate batch call failed" OR "TIMEOUT after")',
  from='now-30m'
)
```

- `produced empty translation` → the provider returned 0 successful fields. Check that `sourceFields` in the .NET orchestrator output isn't empty (the .NET `MaestroFieldConfig.ExtractTranslatableFieldValues` only picks string-typed properties — list fields like `Persona` are skipped today).
- `translate batch call failed` → upstream LLM error (429, content filter, etc.).
- `TIMEOUT after 300.0s` → per-language hard ceiling hit.

### C. 500 from `POST /api/maestro/{Type}/{id}/languages`

**Likely causes:**
- LD flag `multilingual-maestro-v1` not enabled for the org (`BadRequestException: Multilingual Maestro is not enabled for this organization`). Toggle the flag in LaunchDarkly for the test org.
- Python URL is wrong / unreachable (`Failed to request translation from the AI service`). Confirm the orchestrator's hardcoded `_baseUrl` override matches the deployed Python env.
- X-Internal-Key mismatch (Python 401). See failure mode A.

**Datadog check (.NET error log):**
```
mcp__datadog-mcp__search_datadog_logs(
  query='service:degreed.web.next env:pr54743 status:error "translation"',
  from='now-30m'
)
```

### D. 409 from `POST .../languages` — `"Languages already added"`

**Cause:** Those languages have a row in `ExperienceLocalizations` already, in any state (`Translating`, `AutoTranslated`, `ManuallyEdited`, `Failure`). The orchestrator blocks re-adding without removing first.

**Workarounds for testing:**
- Pick fresh languages (`zh`, `pt`, `it`, `de`, ...).
- Pick a different coach.
- (When the per-language delete endpoint lands: call `DELETE /api/maestro/{Type}/{id}/languages/{language}` first.)

### E. Field that should have been translated wasn't

**Cause:** The field's C# property isn't in `MaestroFieldConfig.GetFor(ExperienceType).Translatable`, OR it's a list-typed property (`List<string>`) which `ExtractTranslatableFieldValues` silently skips today.

**Fix:** Add to `MaestroFieldConfig.cs` (.NET) — list-typed-field handling is an explicit follow-up in PR #54743's plan.

## Observation report (use after every test)

When reporting back to the user, structure like this:

### Scenario
Which env, which coach (id + name), which target languages.

### Result per language
| Language | TranslationStatus | Elapsed | Notes |
|----------|---------------------|---------|-------|
| es | AutoTranslated | 14 s | 3/3 fields translated, callback OK |
| fr | Failure | 9 s | LLM returned 429; retry exhausted |

### Datadog evidence
- Python trace link (`trace_id`) for the run.
- `LLMService.save_usage` line per language (token totals).
- `translation callback OK` per language **or** the failure log line.
- .NET-side receipt span for `POST .../experience/{type}/translations`.

### What worked
- Concrete observations grounded in the spans/logs (don't speculate).

### What didn't work
- File:line if you can pin it down. Open questions the user needs to decide.

### Suggested next steps
- e.g. "Add `feedbackRubrics` to MaestroFieldConfig", "bump cache version", "open ticket for LLM 429 frequency".

## Notes & gotchas

- **Auth model.** `POST /api/maestro/{Type}/{id}/languages` requires `[ValidateMaestroStudioAccess]` — login first. Python receives the admin's forwarded cookies in the request body, stores them in Redis via `setup_session_data`, and uses them on the callback. Same pattern every other Maestro endpoint uses.
- **Language codes are short.** The .NET DB column is `varchar(14)`; the orchestrator accepts what comes in. Use `es`, `fr`, `de`, `ja`, `pt`, `zh`, `ko`, `nl`, etc. Not `es-ES` style.
- **Source language defaults to `'en'`.** Coaches created before this PR get `Coaches.SourceLanguage='en'` via DB default. The source row is materialised lazily on the first `AddLanguages` call.
- **The `Coach` URL path is PascalCase** (`/api/maestro/Coach/881/languages`). The CLI handles it for you (`coach` → `Coach`).
- **LD flag.** Every endpoint guards on `multilingual-maestro-v1` via `IsMultilingualEnabledAsync(userProfileKey, organizationId)`. If the flag is off, you get `BadRequestException: Multilingual Maestro is not enabled for this organization`.
- **Token-usage consolidation.** Since the consolidated-usage fix, every LLM call inside a language batch + per-item fallbacks rolls into **one** `save_usage` event per language. So `LLMService.save_usage: N calls, T total tokens, event=translate_coach_es` is the per-language summary line, not one log per LLM call.
- **List-typed source fields (`Persona`, `Capabilities`, ...) are silently dropped today.** `MaestroFieldConfig.ExtractTranslatableFieldValues<T>` only picks `string` scalars. List handling is an explicit follow-up flagged in PR #54743's plan.
- **Hardcoded Python URL.** The .NET orchestrators (`CoachOrchestrator`, `RoleplayOrchestrator`, `MaestroLanguageOrchestrator`, `MaestroStudioOrchestrator`) currently override `_baseUrl` to `pr-948.dgcoachbuilder-api.degreed.dev` for PR-env testing. Remove before merging — config-driven URL is the production path.
