---
name: test-quiz-attempt
description: Use when testing a Maestro quiz attempt live as a learner — taking a quiz via the .NET API and verifying scoring, attempt lifecycle, and LLM processresults inferences.
---

# Quiz Attempt Skill

Mimic a learner taking a Maestro quiz through the .NET API. Supports auto mode and step-by-step mode where Claude reads each question and decides the best answer. Verifies LLM-generated inferences from `processresults`.

## When to Use

- User says "take this quiz", "test quiz 258", "try the quiz as a learner"
- User wants to verify `processresults` LLM inferences are correct
- User wants to check quiz scoring, question flow, or attempt lifecycle
- User created a quiz with the `test-forms` skill and wants to test the learner experience

## Setup

All files are in: `tools/quiz-attempt/`

| File | Purpose |
|------|---------|
| `quiz_attempt.py` | Main CLI tool |
| `quiz_attempt_env.json` | Environment configs |
| `quiz_attempt_config.json` | Settings (strategy, auto-delete, timeouts) |
| `.sessions/` | Generated state (gitignored) |
| `README.md` | Full documentation |

The venv must be activated. Prefix ALL commands with:
```bash
source degreed-coach-builder/venv/bin/activate &&
```

## Auto Mode — Full Quiz in One Command

```bash
python tools/quiz-attempt/quiz_attempt.py login --env local
python tools/quiz-attempt/quiz_attempt.py take <quiz_id> --strategy smart
```

This creates an attempt, answers every question, completes the attempt, and triggers `processresults` — all in one command. Output includes per-question results and final LLM inferences.

Strategies: `smart` (heuristic best guess), `wrong` (intentionally wrong), `random`.

## Step-by-Step Mode — Claude Decides Each Answer

Use this when you want Claude to read each question and make an informed answer choice.

```bash
python tools/quiz-attempt/quiz_attempt.py step <quiz_id>   # create attempt
python tools/quiz-attempt/quiz_attempt.py next              # get question
# Claude reads the question, hint, answers, and decides...
python tools/quiz-attempt/quiz_attempt.py answer 123,456    # submit answer IDs
python tools/quiz-attempt/quiz_attempt.py next              # next question
# repeat...
python tools/quiz-attempt/quiz_attempt.py finish            # complete
python tools/quiz-attempt/quiz_attempt.py process           # trigger LLM inference
python tools/quiz-attempt/quiz_attempt.py results           # full report
```

### How to decide answers (step-by-step)

When `next` returns a question, read:
- `question_text` — the question being asked
- `question_type` — SingleSelect or MultiSelect
- `answers` — list of `{id, text}` options
- `hint` — optional hint for the learner
- `key_takeaway` — the learning point (reveals the correct logic)

Use the `key_takeaway` and your knowledge to pick the correct answer IDs. For MultiSelect, you can select multiple IDs comma-separated.

## Verifying LLM Inferences

After `process`, check the inferences:

1. **Are strengths about correct answers?** Strengths should reference topics where the learner answered correctly
2. **Are improvements about wrong answers?** Improvements should target actual mistakes
3. **No hallucination?** Cross-reference inferences with the actual `outcomes` (correct_ids vs selected_ids)
4. **Actionable?** Do improvements suggest concrete next steps?
5. **Relevant?** Do inferences match the quiz topic and questions?

Use `results` to see the full picture: all outcomes + parsed inferences side by side.

## Cleanup

```bash
# Delete the attempt
python tools/quiz-attempt/quiz_attempt.py delete-attempt

# Or reset (auto-deletes if configured)
python tools/quiz-attempt/quiz_attempt.py reset
```

`auto_delete_attempt_on_reset` is `true` by default in `quiz_attempt_config.json`.

## Typical Test Workflow

1. Create a quiz using `test-forms` skill → save → get `quiz_id`
2. Take the quiz with this skill: `take <quiz_id> --strategy smart`
3. Verify inferences are sensible
4. Optionally re-take with `--strategy wrong` to test failure inferences
5. Clean up: `reset` (auto-deletes attempt)
6. Delete the quiz: use `test-forms` delete command
