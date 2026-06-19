---
name: research-before-implementing
description: Use when about to create a new model/type/interface/component or start a non-trivial feature — search for what already exists and extend it instead of duplicating, and ground the approach in external research before committing
---

# Research Before Implementing

## Overview

Before you build, find out what already exists — in this codebase and in the world. Extend what's there; don't create a parallel duplicate. Ground non-trivial approaches in real external evidence, not training-data recall.

**Core principle:** Most "new" code duplicates something that already exists. Duplication you didn't notice is the expensive kind — two models of the same thing drift apart and both must be maintained.

This is a **flexible** skill — scale the depth to the change — but the search-first step is **non-negotiable** for anything new.

## When to Use

- About to create a new interface, type, model, DTO, or component.
- Starting a non-trivial feature or cross-layer change.
- You catch yourself thinking "I already know how to do this."
- Choosing an architectural approach.

## The Iron Law

```
SEARCH FOR WHAT EXISTS BEFORE YOU CREATE.
EXTEND BEFORE YOU DUPLICATE.
```

## The Method

**1. Search the codebase first.**
- Grep for existing models/types by domain keyword before defining a new one.
- Find the existing component for the UI pattern before building one.
- Find the reference implementation for the layer/convention you're about to touch.

**2. Read what you find.** Understand its shape and naming before deciding.

**3. Extend, don't duplicate.**
```
WRONG — parallel model with new field names
interface NewThingMessage { id; role; content; timestamp }

RIGHT — extend the existing one, add only what's new
interface NewThingMessage extends ChatMessage { skill?: Skill }
```

**4. If 80%+ overlaps an existing thing — STOP and ask** whether to extend or create new. Don't silently fork a near-duplicate.

**5. External research for non-trivial work.** Your training data is stale and misses production experience. Before committing to an approach: run real web searches, **read the actual articles/issues/docs** (not just snippets), and write down what you learned. "I already know this" is not research.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "I already know how to build this" | Knowing the concept ≠ knowing what this codebase already has. Search. |
| "Faster to write fresh than to search" | A parallel duplicate costs forever; a grep costs 30 seconds. |
| "My new model is cleaner than the existing one" | Two models of one thing is the mess. Extend the existing or migrate it. |
| "External research is overkill, I know the pattern" | Training data misses recent breakage and production gotchas. Read current sources. |
| "It's close enough to the existing one, I'll just make my own" | 80%+ overlap = extend or ask. Don't fork silently. |
| "I'll search if I get stuck" | By then you've built the duplicate. Search first. |

## Red Flags - STOP

- Defining a `New*` type without having grepped for an existing one
- Building a component that resembles one you haven't looked for
- Choosing an approach with zero external sources read
- "This is basically the same as X but I'll make a separate one"
- Citing only training-data knowledge for a non-trivial decision

**All of these mean: STOP. Search the codebase and the web first.**

## Verification Checklist

- [ ] Grepped the codebase for existing models/components/patterns for this domain
- [ ] Read the closest existing thing before deciding to create new
- [ ] Chose extend (or asked the user) when overlap was high
- [ ] For non-trivial work: ran real searches and read actual sources
- [ ] Wrote down what the research found

## Composition

- Precedes design: run this, then `superpowers:brainstorming` to choose an approach, then `superpowers:writing-plans`.
- The discovery half of the `feature-research` runbook's Existing Pattern Inventory.
