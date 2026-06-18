---
name: degreed-experience-builder-feature
description: "Degreed Experience Builder (Maestro Studio) feature guide — admin authoring, preview, validation, KB upload. Use when working on the Studio admin interface."
---

# Degreed Experience Builder Feature Guide

## Overview
The Experience Builder (codename "Maestro Studio") is the admin tool for creating, configuring, and managing AI experiences (Coaches, Quizzes, Roleplays). Admins use it to define coach personas, upload knowledge bases, configure guardrails, set up quiz parameters, design roleplay scenarios, and manage user permissions. AI assists throughout — auto-generating configurations, validating inputs, and filling fields.

## Experience Types Manageable

| Type | What Admin Configures | AI Assistance |
|------|----------------------|---------------|
| **Coach** | Persona, instructions, guardrails, vocabulary, knowledge base, conversation starters, skills, feedback rubrics | Auto-fill from description, validate fields, generate configurations |
| **Quiz** | Topics, question count, difficulty, source documents | Generate questions from topics/docs, validate questions, auto-fix invalid |
| **Roleplay** | Persona, scenario, objectives, guardrails, session duration | Validate scenario, fill fields from description |

## End-to-End Builder Flow

### Step 1: Create Draft
```
Admin opens Maestro Studio
    ↓
Frontend: CoachBuilderFacade.createDraft()
    POST /api/maestro/coach/draft
    ↓
.NET: Creates draft coach record in SQL Server
    Returns: coachId (for subsequent operations)
```

### Step 2: AI Auto-Fill (Optional)
```
Admin provides a description (e.g., "Python programming coach for beginners")
    ↓
Frontend: CoachApiService.generateCoach(payload)
    POST /api/maestro/coach/fill
    ↓
.NET: MaestroController → CoachOrchestrator.FillCoachAsync()
    POST {DGAICoachBackendURL}/dgcb/api/coach_builder/fill-coach-fields
    ↓
Python: AI generates complete coach profile:
    {
        "name": "Python Coach",
        "description": "An expert Python programming coach...",
        "instructions": "You are a Python programming coach...",
        "guardrails": "Only discuss Python-related topics...",
        "vocabulary_to_use": ["pythonic", "PEP 8", ...],
        "vocabulary_to_avoid": ["easy", "simple", ...],
        "conversation_starters": ["What Python topic...", ...]
    }
    ↓
Frontend: Populates form fields for admin review/editing
```

### Step 3: Knowledge Base Upload (RAG)
```
Admin uploads documents (PDF, DOCX, TXT, etc.)
    ↓
Frontend: CoachFileUploadService.uploadFiles()
    POST /api/maestro/processfiles/{coachId}  (multipart/form-data)
    ↓
.NET: Creates ApiRequest tracking record, forwards to Python
    POST {DGAICoachBackendURL}/dgcb/api/rag/upload-files
    ↓
Python RAG pipeline:
    1. Document parsing (PDF, DOCX, TXT support)
    2. Text chunking (configurable chunk size/overlap)
    3. Embedding generation (text-embedding-3-large)
    4. Storage in Azure Managed Redis vector store
    5. Index creation for semantic search
    ↓
Frontend: Polls upload status via
    GET /api/maestro/requests/{requestId}/{eventId}
    Until: status = "completed" or "failed"
```

### Step 4: Configuration Generation
```
Admin requests auto-generated configurations:
    ↓
Frontend: CoachApiService.generateRuleGenerator(payload)
    POST /api/maestro/coach/configurations
    ↓
.NET → Python: POST /dgcb/api/coach_builder/configurations
    ↓
Python generates:
    - conversation_starters: Opening prompts for learners
    - guardrails: Safety boundaries
    - capabilities: What the coach can do
    - persona: Coach personality traits
    - vocabulary_to_use: Preferred terminology
    - vocabulary_to_avoid: Banned terminology
```

### Step 5: Validation
```
Admin saves experience configuration:
    ↓
Frontend: CoachApiService.validateCoach(coachId)
    POST /api/maestro/coach/validate/{coachId}
    ↓
.NET → Python: POST /dgcb/api/coach_builder/validate-coach-fields
    ↓
Python validation checks:
    - Field length limits (names, descriptions, instructions)
    - Content safety (injection detection)
    - Guardrail consistency
    - Vocabulary conflict detection
    - Returns: { valid: bool, errors: [...] }

For quiz: POST /dgcb/api/coach_builder/validate-quiz-values
For roleplay: POST /dgcb/api/coach_builder/validate-roleplay-fields
```

### Step 6: Save & Publish
```
Frontend: CoachBuilderFacade.save()
    PUT /api/maestro/coach  (update)
    ↓
.NET: Saves to SQL Server with all configurations
    - Coach metadata, persona, skills, guardrails
    - Knowledge base reference (knowledgeBaseId)
    - Permissions, feedback rubrics
    - Status: draft → published
```

### Step 7: Permission Management
```
Admin configures who can access the experience:
    ↓
Frontend: CoachApiService.getPermissions(), addPermission(), deletePermission()
    GET/POST/DELETE /api/maestro/coach/{id}/permissions
    GET/POST/DELETE /api/maestro/quiz/{id}/permissions
    GET/POST/DELETE /api/maestro/roleplay/{id}/permissions
    ↓
.NET: CRUD operations on permission records
    Supports: individual users, groups, organizations
```

## Quiz Builder Flow

### Generate Quiz from Topics
```
Admin specifies: topics, question count, difficulty
    ↓
POST /api/maestro/quiz/fill
    ↓
.NET → Python: POST /dgcb/api/quiz_builder/fill-quiz-fields
    ↓
Python QuizService pipeline:
    1. TopicGenerator: LLM generates questions per topic with weightage
    2. BatchProcessor: Parallel question generation
    3. SemanticDedup: Remove duplicate/similar questions
    4. Validation pipeline:
       - Structure validator (format check)
       - Content validator (factual accuracy)
       - Difficulty validator (level appropriate)
    5. AutoFixer: Repair invalid questions
    6. Progress events streamed via SSE
    ↓
Returns: Generated quiz with questions, answers, distractors
```

### Generate Quiz from Documents
```
Admin uploads documents + specifies parameters
    ↓
POST /dgcb/api/rag/quiz-file-upload  (upload docs)
POST /dgcb/api/quiz_builder/fill-quiz-fields  (generate)
    ↓
Python pipeline:
    1. Document chunking (chunker.py)
    2. Topic extraction from chunks (topic_extractor.py)
    3. Coverage distribution (coverage.py)
    4. FileGenerator: Generate questions from document chunks
    5. Same dedup + validation pipeline
```

### Quiz Inference (Live Assessment)
```
POST /dgcb/api/quiz_builder/quiz-inference
    ↓
LLM evaluates learner's free-form answers against expected answers
Returns: scoring, feedback, explanations
```

## Roleplay Builder Flow

### Configure Roleplay
```
Admin defines:
    - Persona name, job role, characteristics
    - Scenario context, setting, objectives
    - Session duration (minutes)
    - Guardrails (vocabulary to use/avoid)
    ↓
Frontend: RoleplayBuilderComponents
    ↓
Validation: POST /dgcb/api/coach_builder/validate-roleplay-fields
    ↓
Python validates:
    - Persona consistency
    - Scenario completeness
    - Guardrail validity
    - Injection detection on all text fields
```

### Deep Clone
```
Admin clones existing experience:
    ↓
Frontend: CoachApiService.cloneCoach(id)
    POST /api/maestro/coach/clone/{id}
    ↓
.NET → Python: POST /dgcb/api/coach_builder/deep-clone
    ↓
Python: Deep clones all associated data:
    - Coach configuration
    - Knowledge base (re-indexed)
    - Conversation starters
    - Guardrails, vocabulary
    - Feedback rubrics
```

## Frontend Architecture (Maestro Studio)

### Signal-Based State (CoachBuilderFacade)
```typescript
// Extends BaseFormFacade<CoachFormValues, CoachBuilderState>
state: Signal<CoachBuilderState> = {
    coachId: string,
    knowledgeBaseId: string,
    selectedCoach: Coach,
    coachSubType: string,       // "coach" | "quiz" | "roleplay"
    tableState: TableState,
    validationErrors: ValidationError[],
    originalFormValue: CoachFormValues,
    editMode: boolean,
    loading: boolean,
    progressMessage: string
}

// Computed view model
vm: Signal<CoachBuilderViewModel>  // Public read-only view
editMode: Signal<boolean>
loading: Signal<boolean>
saving: Signal<boolean>
```

### Component Registry
```
maestro-studio/components/ (40+ components):
├── coach-builder-*          # Coach editing
│   ├── coach-builder-form   # Main form with all fields
│   ├── coach-builder-persona # Persona configuration
│   ├── coach-builder-knowledge # Knowledge base upload
│   ├── coach-builder-guardrails # Guardrail editor
│   ├── coach-builder-starters # Conversation starters
│   ├── coach-builder-skills # Skill assignment
│   ├── coach-builder-feedback # Feedback rubric editor
│   └── coach-builder-permissions # Access control
├── quiz-builder-*           # Quiz editing
│   ├── quiz-builder-form    # Quiz configuration
│   ├── quiz-builder-questions # Question editor
│   └── quiz-builder-settings # Quiz settings
├── roleplay-builder-*       # Roleplay editing
│   ├── roleplay-builder-form # Roleplay configuration
│   ├── roleplay-builder-persona # Persona editor
│   └── roleplay-builder-scenario # Scenario editor
└── shared builder components
```

### Builder Services
| Service | Purpose |
|---------|---------|
| `coach-file-upload.service.ts` | Document upload with progress tracking |
| `coach-image-upload.service.ts` | Avatar image upload |
| `coach-knowledge-upload.service.ts` | Knowledge base management |
| `coach-user-search.service.ts` | User search for permissions |
| `page-loader.service.ts` | Loading state management |
| `builder-ui.service.ts` | UI state helpers |
| `component-registry.service.ts` | Dynamic component registration |

### Routes
```
/orgs/{orgId}/maestro-studio/            # Studio home (experience list)
/orgs/{orgId}/maestro-studio/coach/new   # Create new coach
/orgs/{orgId}/maestro-studio/coach/{id}  # Edit coach
/orgs/{orgId}/maestro-studio/quiz/new    # Create new quiz
/orgs/{orgId}/maestro-studio/quiz/{id}   # Edit quiz
/orgs/{orgId}/maestro-studio/roleplay/new    # Create new roleplay
/orgs/{orgId}/maestro-studio/roleplay/{id}   # Edit roleplay
```

## Avatar Generation
```
Admin requests AI-generated avatar:
    ↓
POST /api/maestro/coach/generateavatar
    ↓
AI generates coach avatar image
    Returns: { message, pictureUrl, success }

Delete: DELETE /api/maestro/deleteimage
```

## Experience List & Filtering
```
GET /api/maestro/experiences              # All experiences
GET /api/maestro/experiences/{type}/{id}  # Specific experience
GET /api/maestro/list                     # Paginated list with filters
GET /api/maestro/filterpresets            # Available filter values
```

## Key API Endpoints Summary
| Action | Frontend | .NET | Python |
|--------|----------|------|--------|
| Create draft | POST /maestro/coach/draft | MaestroController | — |
| Auto-fill | POST /maestro/coach/fill | → CoachOrchestrator | /dgcb/api/coach_builder/fill-coach-fields |
| Validate coach | POST /maestro/coach/validate/{id} | → CoachOrchestrator | /dgcb/api/coach_builder/validate-coach-fields |
| Validate quiz | POST /maestro/quiz/validate/{id} | → CoachOrchestrator | /dgcb/api/coach_builder/validate-quiz-values |
| Validate roleplay | — | → CoachOrchestrator | /dgcb/api/coach_builder/validate-roleplay-fields |
| Generate config | POST /maestro/coach/configurations | → CoachOrchestrator | /dgcb/api/coach_builder/configurations |
| Upload docs | POST /maestro/processfiles/{id} | → CoachOrchestrator | /dgcb/api/rag/upload-files |
| Generate quiz | POST /maestro/quiz/fill | → CoachOrchestrator | /dgcb/api/quiz_builder/fill-quiz-fields |
| Deep clone | POST /maestro/coach/clone/{id} | → CoachOrchestrator | /dgcb/api/coach_builder/deep-clone |
| Save | PUT /maestro/coach | MaestroController | — |
| Permissions | GET/POST/DELETE /maestro/coach/{id}/permissions | MaestroController | — |
| Discard | POST /maestro/discardchanges | MaestroController | — |
