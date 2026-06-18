---
description: Update a Maestro skill with latest codebase changes (smart diff)
argument-hint: <skill-name|all>
allowed-tools: Read, Grep, Glob, Edit, Write, Task, Bash(ls:*), Bash(find:*)
---

# Update Maestro Skill

Update the specified skill to reflect the current codebase state using smart diff approach.

## Arguments

- `$1` (required): Skill name or "all"

## Available Skills

| Skill Name | Feature |
|------------|---------|
| `coach-creation` | Admin coach creation in Maestro Studio |
| `quiz-creation` | Admin quiz creation with multi-agent |
| `coach-conversation` | Learner coach chat (Web/Mobile) |
| `quiz-learner` | Learner quiz taking |
| `roleplay-feature` | Roleplay scenarios |
| `voice-realtime` | Voice calls with LiveKit |
| `post-processing` | Conversation analytics extraction |

## Skill Locations

Skills are located at: `.claude/skills/<skill-name>/`
- `SKILL.md` - Main skill file
- `reference.md` - Detailed file references

## Task

### If `$1` is a specific skill name:

1. **Load Current Skill**
   - Read `.claude/skills/$1/SKILL.md`
   - Read `.claude/skills/$1/reference.md`

2. **Extract Documented Paths**
   - Parse all file paths from the skill (look for patterns like `backend/app/`, `fe-workspace/`, `Degreed/`, `degreed-flutter/`)
   - Create a list of all documented file paths

3. **Verify File Existence**
   - For each extracted path, check if the file/directory exists
   - Mark files as: EXISTS, MISSING, or MOVED (if similar file found elsewhere)

4. **Find New Relevant Files**
   - For each documented directory, search for new files not in the skill
   - Focus on: `.py`, `.ts`, `.cs`, `.dart` files
   - Check for new files matching the feature (e.g., new `*coach*.py` files for coach-conversation)

5. **Verify Endpoints**
   - Extract API endpoints from skill (patterns like `/api/`, `/dgcb/api/`)
   - Grep codebase to verify endpoints still exist
   - Find any new related endpoints

6. **Update Skill Files**
   - **Remove**: Paths to deleted files
   - **Add**: Paths to new relevant files in appropriate sections
   - **Update**: Changed endpoint references
   - **Preserve**: All custom content (descriptions, debugging tips, data flows)

7. **Report Changes**
   ```
   === Skill Update Report: $1 ===

   Files Removed (no longer exist):
   - [list removed paths]

   Files Added (new in codebase):
   - [list new paths]

   Endpoints Updated:
   - [list endpoint changes]

   No Changes Needed:
   - [list if nothing changed]
   ```

### If `$1` is "all":

Iterate through all 7 skills in order:
1. coach-creation
2. quiz-creation
3. coach-conversation
4. quiz-learner
5. roleplay-feature
6. voice-realtime
7. post-processing

For each skill, perform the same update process above.

At the end, provide a summary:
```
=== All Skills Update Summary ===

Updated:
- coach-creation: 2 files added, 1 removed
- quiz-learner: 3 files added

No Changes:
- quiz-creation
- coach-conversation
- roleplay-feature
- voice-realtime
- post-processing
```

## Key Directories to Search

| Layer | Directories |
|-------|-------------|
| Python | `degreed-coach-builder/backend/app/` |
| .NET | `Degreed/trunk/Degreed.Web.vNext/Controllers/Api/` |
| .NET | `Degreed/trunk/Degreed.Common.Standard/Orchestrators/` |
| Frontend Web | `fe-workspace/apps/lxp/src/app/` |
| Frontend Mobile | `degreed-flutter/lib/` |

## File Pattern Hints

| Skill | Key Patterns |
|-------|--------------|
| coach-creation | `*coach_builder*`, `*fill_coach*`, `*MaestroStudio*` |
| quiz-creation | `*quiz_*`, `*quiz_utils*`, `*quiz_agents*` |
| coach-conversation | `*sse*`, `*llm*`, `*coach*`, `*conversation*` |
| quiz-learner | `*quiz*`, `*attempt*`, `*QuizController*` |
| roleplay-feature | `*roleplay*`, `*role_play*` |
| voice-realtime | `*realtime*`, `*livekit*`, `*live_kit*` |
| post-processing | `*post_process*`, `*extract_info*`, `*inference*` |

## Important Notes

- **Preserve custom content**: Do not overwrite descriptions, debugging tips, or data flow sections
- **Only modify file lists**: Focus on updating the file path tables and references
- **Report all changes**: Always show what was changed so user can review
- **Handle missing skills**: If skill directory doesn't exist, report error
