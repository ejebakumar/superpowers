---
description: Run E2E tests for recent code changes, analyze failures, and automatically fix issues
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, TodoWrite
argument-hint: [--quick | --all | --no-fix | --file <path>]
---

# Test and Fix Command

Automatically run relevant E2E tests for recent code changes, analyze results, and fix any issues to ensure your changes work correctly.

## Arguments

- `--quick` : Run only smoke tests (faster validation)
- `--all` : Run all tests regardless of what changed
- `--no-fix` : Only report issues, don't attempt automatic fixes
- `--file <path>` : Test changes in specific file(s)

## Task

### PHASE 1: DETECT CHANGES

First, identify what files have changed:

```bash
cd degreed-coach-builder

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 DETECTING CHANGES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📝 Staged Changes:"
git diff --name-only --staged

echo ""
echo "📝 Unstaged Changes:"
git diff --name-only

echo ""
echo "📝 Recent Commit Changes:"
git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "No recent commits"
```

Collect all changed files and read them to understand what was modified.

### PHASE 2: MAP CHANGES TO TESTS

Use this mapping to determine which tests to run:

| If changed path contains... | Run these tests |
|---------------------------|-----------------|
| `backend/app/llm/` | `test_coach_conversation.py`, `test_learner_conversation.py`, `test_llm_conversation.py` |
| `backend/app/llm/prompt` | `test_coach_conversation.py`, `test_learner_conversation.py` |
| `backend/app/routers/coach` | `test_learner_conversation.py`, `test_health_endpoints.py` |
| `backend/app/routers/quiz` | `test_quiz_conversation.py`, `test_learner_quiz_flow.py`, `test_quiz_inference_validation.py` |
| `backend/app/routers/rag` | `test_rag_files.py` |
| `backend/app/routers/realtime` | `test_realtime_api.py` |
| `backend/app/routers/sse` | `test_coach_conversation.py`, `test_learner_conversation.py` |
| `backend/app/routers/post_process` | `test_learner_conversation.py` |
| `backend/app/services/quiz` | `test_quiz_conversation.py`, `test_quiz_inference_validation.py` |
| `backend/app/services/coach` | `test_coach_conversation.py` |
| `backend/app/services/post_process` | `test_learner_conversation.py` |
| `backend/app/agents/` | `test_e2e_integration.py`, `test_coach_conversation.py` |
| `backend/app/config/` | `test_health_endpoints.py` |
| `e2e_tests/tests/test_*.py` | Run that specific test file directly |
| `e2e_tests/workflows/` | Run related workflow test |
| `e2e_tests/helpers/` | Run related helper test |

**If `--all` argument provided**: Run all tests: `pytest tests/ -v`
**If `--quick` argument provided**: Run only smoke tests: `pytest tests/ -m smoke -v`
**If no mapping found**: Default to smoke tests

Display mapping decision to user:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TEST MAPPING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Changed Files → Test Files:
  - backend/app/llm/prompt.py → test_coach_conversation.py, test_learner_conversation.py
  - backend/app/services/coach.py → test_coach_conversation.py

Tests to run:
  - test_coach_conversation.py
  - test_learner_conversation.py
```

### PHASE 3: RUN TESTS

```bash
cd degreed-coach-builder/e2e_tests

# Activate virtual environment
source .venv/bin/activate

# Verify environment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 RUNNING TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Environment: $(which python)"

# Check .env exists
if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file missing - tests may fail authentication"
fi
```

Run the mapped tests:

```bash
# For each mapped test file
python -m pytest tests/<test_file>.py -v --tb=short -x --timeout=300
```

**Options:**
- `-v` : Verbose output
- `--tb=short` : Short traceback for errors
- `-x` : Stop on first failure (faster iteration)
- `--timeout=300` : 5 minute timeout per test

For quick mode (`--quick`):
```bash
python -m pytest tests/<test_file>.py -v --tb=short -m smoke -x
```

### PHASE 4: ANALYZE RESULTS

Parse test output and identify:

**Success Pattern:**
```
=================== X passed in Y.YYs ===================
```
→ All tests passed! Report success and exit.

**Failure Pattern:**
```
FAILED tests/test_xxx.py::TestClass::test_name - AssertionError: ...
```
→ Extract:
1. Test file path and test name
2. Error type and message
3. Line number where failure occurred
4. Expected vs actual values

**Error Pattern:**
```
ERROR tests/test_xxx.py::TestClass::test_name
```
→ Setup/teardown or import issues

Display results:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 TEST RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Passed: 15
❌ Failed: 2
⚠️  Errors: 0

Failed Tests:
1. test_coach_conversation.py::TestCoachCreation::test_persona_adherence
   Error: AssertionError: Expected persona trait 'supportive' in response

2. test_learner_conversation.py::TestLearnerChat::test_turn_completion
   Error: TimeoutError: SSE stream timed out after 60s
```

### PHASE 5: FIX FAILURES (if not `--no-fix`)

For each failed test:

**Step 5.1: Understand the Test**

Read the failing test file:
```bash
# Read the test to understand expectations
cat e2e_tests/tests/<test_file>.py
```

Understand:
- What the test expects
- What APIs/endpoints it calls
- What assertions must pass

**Step 5.2: Read Related Source Code**

Read the changed source files that the test exercises:
```bash
# Read the modified source file
cat backend/app/<path>/<file>.py
```

**Step 5.3: Identify Root Cause**

Common failure causes:

| Error Pattern | Likely Cause | Fix Approach |
|--------------|--------------|--------------|
| `AssertionError: expected X, got Y` | Logic error or schema change | Fix source logic or update test expectation |
| `KeyError: 'field_name'` | API response missing field | Check API returns expected fields |
| `TimeoutError` on SSE | LLM too slow or prompt issue | Increase timeout or optimize prompt |
| `ConnectionError` | Service not running | Start backend service |
| `401 Unauthorized` | Auth cookies invalid | Check .env credentials |
| `ValidationError` | Pydantic model mismatch | Update model to match API |

**Step 5.4: Apply Fix**

Make the MINIMAL change needed:
- If test expectation is wrong → Update test
- If source code has bug → Fix source code
- If model/schema mismatch → Update model

**Step 5.5: Re-run Failed Test**

After applying fix:
```bash
python -m pytest tests/<test_file>.py::<TestClass>::<test_name> -v --tb=short
```

**Step 5.6: Iterate**

If still failing after 3 attempts:
- Report the issue
- Ask user for guidance
- Do NOT continue making changes

### PHASE 6: REPORT RESULTS

Generate final report:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔬 TEST & FIX REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 CHANGES DETECTED
| File | Type | Lines |
|------|------|-------|
| backend/app/llm/prompt.py | Modified | +15, -3 |
| backend/app/services/coach.py | Modified | +8, -2 |

🧪 TESTS EXECUTED
| Test File | Total | Passed | Failed |
|-----------|-------|--------|--------|
| test_coach_conversation.py | 12 | 12 | 0 |
| test_learner_conversation.py | 8 | 7 | 1 |

🔧 ISSUES FIXED
1. TimeoutError in test_turn_completion
   - Root Cause: SSE timeout too short for new prompt
   - Fix: Increased SSE_TIMEOUT from 60s to 120s
   - File: e2e_tests/config/settings.py:45

⚠️  REMAINING ISSUES
(none)

📊 FINAL STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ALL TESTS PASSING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your changes have been verified and are working correctly!
```

Or if issues remain:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ TESTS FAILING - NEEDS ATTENTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1 test(s) still failing after fix attempts.
Please review the issues above and fix manually.

To re-run failed tests:
  cd e2e_tests && source .venv/bin/activate
  python -m pytest tests/test_learner_conversation.py::test_name -v
```

## Important Rules

1. **ALWAYS read the test file before attempting fixes** - understand expectations
2. **Make minimal changes** - fix only what's broken, don't refactor
3. **Re-run tests after each fix** - verify the fix works
4. **Stop after 3 failed fix attempts** - ask user for help
5. **Never modify test data/scenarios** without explicit approval
6. **Preserve existing functionality** - don't break other tests
7. **Check if backend is running** before running integration tests

## Quick Reference: E2E Test Structure

```
e2e_tests/
├── tests/                         # Test files
│   ├── test_e2e_integration.py    # Full lifecycle tests
│   ├── test_coach_conversation.py # Coach creation via LLM
│   ├── test_learner_conversation.py # Learner chat with coach
│   ├── test_quiz_conversation.py  # Quiz creation via LLM
│   ├── test_learner_quiz_flow.py  # Taking quizzes
│   ├── test_health_endpoints.py   # Health/smoke tests
│   └── ...
├── workflows/                     # Business flow orchestrators
├── helpers/                       # API operation helpers
├── core/                          # HTTP, SSE, auth infrastructure
└── config/
    ├── settings.py               # Environment configuration
    └── scenarios/                # YAML test scenarios
```

## Test Markers

| Marker | Description |
|--------|-------------|
| `smoke` | Quick verification tests |
| `regression` | Full coverage tests |
| `slow` | Long-running tests |
| `e2e` | End-to-end integration tests |
| `llm_validation` | Tests using LLM-as-judge |
| `quiz_builder` | Quiz creation tests |
| `coach` | Coach-related tests |

## Usage Examples

```bash
# Run tests for current changes
/test-and-fix

# Quick smoke test only
/test-and-fix --quick

# Run all tests
/test-and-fix --all

# Report only, no auto-fix
/test-and-fix --no-fix

# Test specific file changes
/test-and-fix --file backend/app/llm/prompt.py
```
