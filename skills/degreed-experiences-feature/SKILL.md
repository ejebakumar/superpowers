---
name: degreed-experiences-feature
description: "Degreed Experiences (Maestro) learner feature guide — Coach, Roleplay, Quiz, Forms E2E flows. Use when working on learner-facing experiences."
---

# Degreed Experiences Feature Guide

## Overview
Degreed Experiences is the AI coaching platform (codename "Maestro"). It delivers four experience types — Coach, Roleplay, Quiz, and Forms — through text (SSE streaming) and voice (LiveKit WebRTC) modalities. The system features a sophisticated prompt strategy engine, RAG-enhanced knowledge bases, three-layer guardrails, Kirkpatrick evaluation framework, and real-time voice agents with session time management.

## Experience Types

### 1. Coach (Text + Voice)
**Purpose**: AI-powered skill coaching with personalized learning guidance
**Modalities**: Text (SSE) and Voice (LiveKit WebRTC)
**Key Features**: RAG knowledge base, skill proficiency tracking, conversation starters, pathway integration, multi-turn memory, content recommendations, summary generation, Kirkpatrick evaluation

### 2. Roleplay (Text + Voice)
**Purpose**: Interactive scenario-based learning with AI personas
**Modalities**: Text (SSE) and Voice (LiveKit)
**Key Features**: Persona-based interactions, three-layer guardrails, time-managed sessions (70%/90%/100% warnings), performance scoring, roleplay-specific feedback

### 3. Quiz
**Purpose**: AI-generated assessments from documents or topics
**Modalities**: Text-only
**Key Features**: Smart question generation with distractors, topic-based distribution, semantic deduplication, validation + auto-repair pipeline, difficulty levels, progress tracking

### 4. Forms
**Purpose**: Structured data collection within coaching
**Modalities**: Text-based within coach conversations
**Key Features**: Dynamic form fields, validation, integrated with coach flow

## End-to-End Text Coach Flow

### Step 1: Connect (Initialize Session)
```
Frontend POST /api/coach/Connect
    ↓
.NET CoachController.Connect()
    ↓
CoachOrchestrator.HandleConnectRequestAsync()
    - Enriches with: UserProfile, UserInterests, Inferences,
      PreviousMessages, TimeZone, Skill, PathwayDetails
    ↓
POST {DGAICoachBackendURL}/dgcb/api/sse/llm-text-connect/{sessionId}
    Payload: CoachConnectRequest {
        SessionId, CoachId, Coach (full metadata),
        UserProfile (name, role, skills), UserInterests,
        ConversationId, Inferences (previous skill extractions),
        PreviousMessages (conversation history),
        TimeZone, Skill (dict), PathwayDetails
    }
    ↓
Python: setup_session_data()
    - Stores unified session in Redis (SessionDataModel)
    - Embeds coach data (persona, guardrails, instructions, vocabulary)
    - Sets 24-hour TTL
    - Returns session confirmation
```

### Step 2: Chat (Stream AI Response)
```
Frontend GET /api/coach/Chat/{sessionId}
    ↓
.NET CoachOrchestrator.HandleChatRequestAsync()
    ↓
GET {DGAICoachBackendURL}/dgcb/api/sse/llm-text-sse/{sessionId}
    via SendSseRequestAsync() — filters "data: ping-pong" keep-alive
    ↓
Python SSE streaming:
    1. Read user message from queue
    2. PromptStrategyFactory.create() → CoachPromptStrategy
    3. Build prompt:
       a. CoachDataFetcher.fetch() — user profile, coach config, history
       b. TemplateSelector.select() — choose template based on context
       c. PromptBuilder.build() — assemble final system + user prompt
       d. Inject: default instructions (1957 LOC), session knowledge,
          skill proficiency, pathway context, guardrails
    4. LlmClient.stream() — Azure OpenAI async streaming
       - Token counting via tiktoken
       - Tool detection: Create_Coach, Create_Quiz, ShowDifficultyButtons
    5. Stream tokens as SSE events to .NET → Frontend
```

### Step 3: Post-Processing (After Conversation)
```
POST /dgcb/api/post_process/extract_conversation_info_v2
    ↓
Extraction pipeline (11 types):
    1. ConversationContext    — Full conversation summary
    2. Feedback              — Performance feedback
    3. KirkpatrickEvaluation — Level 1-4 learning effectiveness
       - Level 1 (Reaction): User engagement and satisfaction
       - Level 2 (Learning): Knowledge/skill acquisition
       - Level 3 (Behavior): Application of learning
       - Level 4 (Results): Business impact indicators
    4. ConversationOneLiner  — Summary headline
    5. ConversationSummary   — Detailed summary
    6. Recommendations       — Next steps
    7. TaskItems             — Action items
    8. SkillReview           — Skill assessment (for skill coaches)
    9. NewSkillReview        — Newly identified skills
    10. SkillAssessmentSummary — Overall evaluation
    11. RoleplayFeedback     — Roleplay-specific performance

Status tracking: Pending → Processing → Success/Failure/Timeout
Async with callback URLs for frontend polling
```

## End-to-End Voice Coach Flow

### Step 1: Register Call
```
Frontend POST /api/coach/RegisterCall
    ↓
.NET CoachOrchestrator.HandleRegisterRequestAsync()
    Payload: CoachRegisterRequest {
        SessionId, AgentType ("Coach"),
        CoachId, Coach, UserProfile, UserInterests,
        ConversationId, Inferences, PreviousMessages,
        SampleRate, TimeZone, Skill, PathwayId,
        PathwayDetails, SkillReviewInferences
    }
    ↓
POST {DGAICoachBackendURL}/dgcb/api/realtime/register-realtime-call
    ↓
Python:
    1. Create LiveKit room
    2. Configure voice agent (CoachAgent or RolePlayAgent)
    3. Generate LiveKit access token
    4. Return { CallId, AccessToken, SocketUrl }
```

### Step 2: WebRTC Session
```
Frontend connects to LiveKit room with AccessToken
    ↓
LiveKit server mediates WebRTC connection
    ↓
Python voice agent (BaseVoiceAgent subclass):

CoachAgent(BaseVoiceAgent):
    - RAG tool: create_rag_tool(rag_manager, config)
      - Tool name: "get_relevant_knowledge"
      - 5 queries per request, 1 exact match
      - Quorum: 3 (agreement from 3 search ops)
      - Timeout: 2.5 seconds
      - Uses RedisRAGManager for semantic search
    - Transcript management
    - Azure Speech STT/TTS

RolePlayAgent(BaseVoiceAgent):
    - Session time management:
      - 70% warning: "We're about 70% through our time"
      - 90% warning: "Almost out of time, let's wrap up"
      - 100%: Auto-disconnect
    - Performance scoring
    - Persona maintenance with guardrails
    - End call tool: create_end_call_tool()
```

### Step 3: Post-Call
```
Agent disconnect triggers:
    1. Save final transcript
    2. Trigger post-processing (same 11 extraction types)
    3. Frontend polls for results
```

## Prompt Engineering Deep Dive

### Master Coach Instructions (prompt.py — 1,791 LOC)
```
Section 1: Default Instructions
    - Welcome & onboarding behavior
    - Clear response formatting
    - Hyper-personalization based on user profile

Section 2: Engagement Strategies
    - Tips, Challenges, Quizzes, Assessments, Role Play
    - Dynamic strategy selection based on conversation flow

Section 3: Support & Motivation
    - Encouragement patterns
    - Progress acknowledgment

Section 4: Previous Session Knowledge
    - Context from past conversations
    - Feedback history
    - Behavior patterns & preferences
    - Skill progress tracking
    - Kirkpatrick evaluation history

Section 5: Profile Display
    CRITICAL: Profile display MUST override word limits
    Multi-line structured format with Name/Role/ALL skills with details

Section 6: Pathway Instructions (PATHWAY_PROMPT_TEMPLATE)
Section 7: Plan Instructions (PLAN_PROMPT_TEMPLATE)
```

### Strategy Pattern (Prompt Generation)
```
PromptStrategyFactory.create(experience_type)
    ├── CoachPromptStrategy (text + voice coaching)
    │   └── coach_components/
    │       ├── data_fetcher.py (654 LOC) — fetch user/coach context
    │       ├── skill_proficiency.py (210 LOC) — skill assessment
    │       ├── template_selector.py (350 LOC) — choose template
    │       └── prompt_builder.py (333 LOC) — assemble prompt
    ├── RoleplayPromptStrategy (roleplay scenarios)
    │   └── roleplay_components/
    │       └── prompt_builder.py (168 LOC) — roleplay prompt assembly
    └── GeneratePromptStrategy (content generation)
```

### Three-Layer Guardrail System (Roleplay)
```
Layer 1: System Guardrails (NON-OVERRIDABLE)
    - Core safety rules enforced by platform
    
Layer 2: Platform Guardrails (NON-OVERRIDABLE)
    - Organization-level policies
    
Layer 3: User-Defined Guardrails
    - Admin-configured per experience
    - Derived from vocabulary_to_use, vocabulary_to_avoid
    
Conflict Resolution:
    System > Platform > User (strict precedence)
```

## RAG Pipeline
```
Document Upload (POST /dgcb/api/rag/upload-files):
    1. Document received (PDF, DOCX, etc.)
    2. Chunking (simple_chunker or smart chunker)
    3. Embedding via text-embedding-3-large
    4. Storage in Azure Managed Redis vector store
    5. Index creation for semantic search

Query-Time RAG:
    1. User question → generate search queries (5 queries + 1 exact match)
    2. Semantic search across vector store
    3. Quorum voting (3 results must agree)
    4. Re-ranking (if RERANKING_ENABLED)
    5. Timeout protection (2.5s)
    6. Inject top results into prompt context
    7. Ground-truth guarantee: "Knowledge base is always authoritative"
```

## Quiz Generation Pipeline
```
POST /dgcb/api/quiz_builder/fill-quiz-fields
    ↓
QuizService orchestration:
    1. Input: topics OR uploaded documents
    2. File Processing:
       - Document chunking (chunker.py)
       - Topic extraction (topic_extractor.py)
       - Coverage distribution (coverage.py)
    3. Question Generation:
       - batch_processor.py — parallel generation
       - file_generator.py OR topic_generator.py
       - LLM generates questions with distractors
    4. Deduplication:
       - semantic_dedup.py — LLM-based similarity detection
       - llm_filter.py — quality filtering
       - quality_scorer.py — scoring
    5. Validation:
       - structure validator (correct format)
       - content validator (factual accuracy)
       - difficulty validator (level appropriate)
       - auto_fixer.py — automatic repair of invalid questions
    6. Progress tracking via asyncio.Queue → SSE events
```

## Frontend Components

### Angular Coach UI
| Component | Purpose |
|-----------|---------|
| `coach-conversation-page-v2` | Main chat page layout |
| `coach-conversation-v2` | Virtualized message list |
| `coach-conversation-input-v2` | User input (text + voice toggle) |
| `coach-conversation-feedback` | Feedback collection UI |
| `coach-summary-tab` | Generated summary display |
| `coach-skill-report-tab` | Skill assessment results |
| `coach-skill-evaluation` | Detailed evaluation UI |
| `coach-recommendation` | Content recommendations |
| `coach-voice-transcript-tab` | Voice session transcripts |
| `coach-explore-all` | Browse all available coaches |

### Angular State (CoachConversationFacade)
Signal-based computed selectors:
```typescript
messages, inProgress, audioMode, conversationId,
activeCoach, showLoader, placeholderText,
showDrawer, viewRightPanel, showConversations,
rightPanelType, hasSummary, isSkillReview,
voiceModeEnabled, textModeEnabled, conversationModes
```

### Angular Services
- `coach-api.service.ts` — API communication (root singleton)
- `coach-chat.service.ts` — Chat handling
- `openai-realtime.service.ts` — Voice/audio real-time
- `voice-analysis.service.ts` — Voice analysis
- `transcript.service.ts` — Speech-to-text transcripts
- `conversation-polling.service.ts` — Async conversation updates

## Function Calling (Tools)
Available during coach conversations:
```json
{
  "Create_Coach": {
    "parameters": { "coach_name", "description", "instructions", "guardrails",
                    "vocabulary_to_use", "vocabulary_to_avoid" }
  },
  "Create_Quiz": {
    "parameters": { "quiz_name", "topics", "question_count",
                    "difficulty_level", "topic_weightage" }
  },
  "Show_Difficulty_Buttons": {
    "description": "UI helper for quiz difficulty selection"
  }
}
```

## Key Files Reference
| Layer | File | Purpose |
|-------|------|---------|
| Python | `api/sse.py` | SSE text coaching endpoints |
| Python | `api/realtime.py` (66KB) | Voice registration |
| Python | `llm/llm.py` (654 LOC) | LlmClient core |
| Python | `llm/prompt.py` (1957 LOC) | Master instructions |
| Python | `llm/roleplay_prompts.py` | Roleplay guardrails |
| Python | `llm/prompt_strategies/` | Strategy pattern |
| Python | `llm/tools/` | Function calling |
| Python | `realtime/agents.py` | Voice agents |
| Python | `quiz/service.py` | Quiz orchestration |
| Python | `post_process/extract_info_v4.py` | Extraction pipeline |
| Python | `db/redis_rag.py` | RAG operations |
| .NET | `CoachController.cs` | REST endpoints |
| .NET | `CoachOrchestrator.cs` | Python integration |
| Angular | `coach-conversation.facade.ts` | State management |
| Angular | `coach-api.service.ts` | API service |
