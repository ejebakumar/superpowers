---
name: degreed-assistant-feature
description: Use when working on the Degreed Assistant (DGA) learner feature — its four scoped quick-action capabilities (pathway curation, skill-content search, skill updates, manager content recommendation), tool-based reasoning, scopes, or multi-turn conversation memory.
---

# Degreed Assistant Feature Guide

## Overview
The Degreed Assistant (DGA) is an AI-powered quick-action assistant for learners. It provides four scoped capabilities: curating learning pathways, finding skill-related content, updating user skills, and recommending content to team members (manager scope). Built on LangChain with Azure OpenAI, it uses tool-based reasoning with multi-turn conversation memory.

## End-to-End Request Flow

### 1. Frontend Initiates
```
Angular: DegreedAssistantService.sendQuery(query, correlation_id)
  → POST /api/assistant/Connect  (to .NET)
  
Flutter: AssistantCubit.connect()
  → POST /api/mobile/v2/assistant/Connect  (to .NET)
```

### 2. .NET Enriches & Forwards
```csharp
// DegreedAssistantController.Connect()
// Checks IsDegreedAssistantEnabledAsync() — feature flag + scope permissions:
//   UseMaestroQuickActionsFindSkillRelatedContent
//   UseMaestroQuickActionsCuratePathway
//   UseMaestroQuickActionsUpdateYourSkills
//   UseMaestroQuickActionsRecommendContentToMyTeam

// DegreedAssistantOrchestrator.ConnectAsync()
ConnectModel {
    session_id,        // UUID from frontend
    correlation_id,
    scope,             // One of the 4 scopes
    query,             // User's natural language input
    user_profile_key,  // From authenticated user
    organization_id,
    cookies,           // Dict of auth cookies for callback
    host               // Platform host for API callbacks
}
→ POST {DGAssistantURL}/dgassistant/connect
```

### 3. Python Creates Session
```python
# application.py - ConnectRequest handler
# 1. Validate request
# 2. Create session in Redis (session_id → user context, cookies, host)
# 3. Return session confirmation
```

### 4. SSE Streaming Begins
```
Angular: DegreedAssistantService.listenToSSE(observer)
  → GET /api/assistant/Chat?session_id={id}
  → .NET pipes: GET {DGAssistantURL}/dgassistant/chat?session_id={id}
  → Python streams tokens as text/event-stream

Response chunks:
{ "Is_final": false, "response": "partial...", "suggestions": [], "error": null }
{ "Is_final": true, "response": "full response", "suggestions": ["Follow-up 1", "Follow-up 2"], "error": null }
```

### 5. Python AI Processing Pipeline
```
User Query
    ↓
Intent Classification (scope detection if not pre-selected)
    ↓
Scope Router → selects appropriate LangChain chain
    ↓
Tool Selection (based on scope):
  ├── "Curate pathway"     → Pathway_Creator, find_content_request_sender
  ├── "Find content"       → find_content_request_sender
  ├── "Update skills"      → addUserSkills, updateUserProfileTagRatings, addFocusSkill
  └── "Recommend to team"  → RecommendResources, getGroups
    ↓
LangChain Chain Execution:
  1. PromptTemplate with user context, conversation history, scope instructions
  2. Azure OpenAI completion (GPT-4o / GPT-5.1)
  3. Output parsing for structured responses
  4. Tool execution if function call detected
    ↓
Streaming Response via async generator → SSE
```

## Scope Deep Dive

### Scope 1: "Curate pathway"
**Purpose**: AI creates a structured learning pathway with sections and content items.

**Tools Used**:
- `Pathway_Creator()` — Creates pathway structure via .NET API
  - POST /api/pathways (create summary)
  - POST /api/pathways/{id}/sections (add sections)
  - POST /api/pathways/{id}/sections/{sectionId}/inputs (add content items)
- `find_content_request_sender()` — Searches for relevant learning content
  - GET /api/content/search with facets and filters

**Flow**:
1. User: "Create a pathway for learning Python"
2. AI plans pathway structure (title, description, sections)
3. Calls Pathway_Creator to create pathway shell
4. For each section, searches for relevant content
5. Adds content items to sections
6. Returns pathway link to user

### Scope 2: "Find skill-related content"
**Purpose**: Search and recommend learning resources related to a skill.

**Tools Used**:
- `find_content_request_sender()` — Search with re-ranking
  - Searches .NET content API
  - Applies relevance ranking
  - Filters by content type, provider, language

**Flow**:
1. User: "Find resources for machine learning"
2. AI generates optimized search query
3. Calls content search API
4. Ranks and formats results
5. Streams formatted response with links

### Scope 3: "Update your skills"
**Purpose**: Manage user's skill profile — add skills, set ratings, focus skills.

**Tools Used**:
- `addUserSkills()` — Add skills to profile via tag API
  - POST /api/tags/find (find or create tag)
  - POST /api/tags/rate (set rating)
- `updateUserProfileTagRatings()` — Update existing skill ratings
- `addFocusSkill()` — Set a skill as focus skill

**Flow**:
1. User: "Add Python at expert level"
2. AI identifies skill name and rating
3. Finds/creates tag in system
4. Sets rating (1-5 scale)
5. Optionally sets as focus skill

### Scope 4: "Recommend content to my team"
**Purpose**: Manager recommends learning resources to direct reports.

**Tools Used**:
- `RecommendResources()` — Send recommendations via manager API
  - GET /api/managers/directreports (get team members)
  - POST /api/managers/recommend (send recommendation)
- `getGroups()` — Find learning groups
- `JoinGroup()` — Join user to group

**Flow**:
1. Manager: "Recommend this Python course to my team"
2. AI fetches manager's direct reports
3. Searches for content if not specified
4. Sends recommendations to selected team members
5. Returns confirmation

## LangChain Architecture

### Tool Registration (AgentUtils class — 1,825 LOC)
```python
class AgentUtils:
    def __init__(self, session_id, redis_client, ...):
        self.tools = [
            Tool(name="Pathway_Creator", func=self.pathway_creator, description="..."),
            Tool(name="find_content", func=self.find_content_request_sender, description="..."),
            Tool(name="addUserSkills", func=self.add_user_skills, description="..."),
            # ... more tools
        ]
    
    # Each method:
    # 1. Parses LLM output into structured parameters
    # 2. Calls .NET API via stored session cookies
    # 3. Formats response for LLM to continue reasoning
```

### Prompt Engineering
- **System prompts**: Per-scope with detailed instructions, few-shot examples
- **Context injection**: User profile, org context, conversation history
- **Memory**: Redis-backed ConversationBufferMemory for multi-turn
- **Output parsers**: Structured response parsing for tool calls

### Memory Management
- **ConversationBufferMemory** and **ConversationBufferWindowMemory**: Full and windowed conversation history in Redis
- **ExtendedRedisChatMessageHistory**: Custom Redis-backed chat history implementation (in `genai/extended_redis_chat_history.py`)
- **Session TTL**: Managed via Redis expiration
- **Context window**: Token-aware truncation to fit model limits

## Frontend Components

### Angular
- `DegreedAssistantService`: SSE service with EventSource connection management
- `maestro-conversation-page-v2.component.ts`: Main chat page
- `coach-dga-chat-conversation.component.ts`: Chat message display
- `DGAssistantChatMessage`: { isAI, id, datetime, message, suggestions }

### Flutter
- `AssistantCubit`: BLoC state management for assistant chat
- Custom SSE client for streaming responses
- Suggestion chip widgets for follow-up actions

## Available Flows (Scopes)
Fetched via `GET /api/assistant/Flows` → returns `DegreedAssistantFlowResponse[]`:
```json
[
  { "flowId": 1, "label": "Curate pathway", "description": "...", "quickReply": [...], "suggestions": [...], "isActive": true },
  { "flowId": 2, "label": "Find skill-related content", "description": "...", ... },
  { "flowId": 3, "label": "Update your skills", "description": "...", ... },
  { "flowId": 4, "label": "Recommend content to my team", "description": "...", ... }
]
```

## Key Files Reference
| Layer | File | Purpose |
|-------|------|---------|
| Frontend | `degreed-assistant/services/degreed.assistant.service.ts` | SSE service |
| Frontend | `degreed-assistant/degreed-assistant.constants.ts` | Routes/constants |
| .NET | `Controllers/Api/DegreedAssistantController.cs` | REST endpoints |
| .NET | `Orchestrators/DegreedAssistantOrchestrator.cs` | Python integration |
| .NET | `Models/DegreedAssistantParameters.cs` | Request/response DTOs |
| .NET | `Constants/CoachAIBackendRoutes.cs` | Python route definitions |
| Python | `backend/application.py` | FastAPI app + endpoints |
| Python | `backend/genai/tools_and_chains/agent_utils.py` | Core AI logic (1,825 LOC) |
| Python | `backend/genai/prompts/prompt_and_description*.py` | Consolidated prompt templates (v0, v1, v2) |
| Python | `backend/genai/intent_classifier.py` | Intent classification (single file) |
| Python | `backend/api/*.py` | .NET API wrappers |
