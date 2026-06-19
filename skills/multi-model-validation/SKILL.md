---
name: multi-model-validation
description: Use when about to declare a review BLOCKED or APPROVED, assert non-trivial code is correct or complete, or make a security/correctness/data-integrity call — confirm the verdict with an independent model before presenting it as final
---

# Multi-Model Validation

## Overview

High-stakes verdicts get confirmed by at least one **independent** model before you present them as final.

**Core principle:** Your own confidence is not evidence. A model that shares your reasoning chain shares your blind spots. An independent model — one that never saw how you got here — catches errors single-model self-review structurally cannot.

This is a **rigid** skill for the verdicts it covers. It is not "ask another model about everything" — it gates a specific, high-cost class of claims.

## When to Use

- Declaring a code review **BLOCKED** or **APPROVED**.
- Asserting that non-trivial code is **correct** or that a task is **done**.
- Any **security, auth, billing, PII, or data-integrity** decision.
- Resolving a hard disagreement where you can't tell who's right.

**Not needed for:** trivial changes, formatting, well-covered mechanical edits, or anything already proven by a passing test you watched fail first (see `superpowers:test-driven-development`).

## The Iron Law

```
NO BLOCKING VERDICT AND NO HIGH-STAKES "IT'S CORRECT" CLAIM
WITHOUT INDEPENDENT CONFIRMATION FIRST
```

A single model's opinion — including yours — is a hypothesis, not a verdict.

## The Method

1. **State the claim precisely.** "X is correct because Y" or "X is BLOCKED because Z at file:line."
2. **Pose the SAME claim to ≥2 independent sources.** At least two of:
   - A second model via your consensus/challenge tooling (e.g. `zen` `challenge` / `consensus`, or a second-opinion agent).
   - A runnable proof — execute the code, run the test, reproduce the bug.
   - An authoritative external source (web search → read the actual doc/issue, not a summary).
3. **Demand evidence, not agreement.** Each source must cite a file:line, a URL, or a runnable result. "Looks fine to me" from a second model is not validation.
4. **Disagreement → investigate, don't average.** If sources conflict, you've found the risk. Dig until you know which is right. Never split the difference.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I'm confident, that's enough" | Confidence is the feeling self-review can't distinguish from being wrong. Confirm it. |
| "Asking another model is slow" | A wrong BLOCKED wastes a rewrite; a wrong APPROVED ships a bug. Slower is cheaper. |
| "It's obviously right" | Obvious-but-wrong is exactly what an independent check catches. |
| "The second model will just agree" | Then it costs nothing. If it disagrees, you just avoided a bad verdict. |
| "I already reasoned through it carefully" | Careful reasoning down one chain still has one chain's blind spots. |
| "There's no second model available" | Then use a runnable proof or an authoritative source. Independence, not specifically a second LLM. |

## Red Flags - STOP

- About to write "BLOCKED" or "APPROVED" with only your own analysis
- Claiming code is correct without having run it or cited a source
- A security/auth/billing/PII call backed only by intuition
- Two sources disagree and you're about to pick the convenient one
- "I'll validate it later if someone questions it"

**All of these mean: STOP. Get independent confirmation before you present the verdict.**

## Verification Checklist

- [ ] The claim is stated precisely enough to be checked
- [ ] At least two independent sources evaluated it
- [ ] Each source cited evidence (file:line / URL / runnable result), not just agreement
- [ ] Any disagreement was investigated to resolution, not averaged
- [ ] The final verdict names the evidence that backs it

## Composition

- The teeth behind `superpowers:verification-before-completion` for high-stakes "done" claims.
- Pairs with `superpowers:systematic-debugging` when validating a root-cause claim.
- Used by review/critic runbooks (e.g. `feature-critic`, `feature-review`) as the gate before any BLOCKED verdict.
