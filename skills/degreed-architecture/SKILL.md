---
name: degreed-architecture
description: Use when you need cross-service or cross-repo context for the Degreed platform — how the .NET backend, Angular web, Flutter mobile, degreed-coach-builder (Maestro), and degreed-assistant repositories connect, where a request flows end to end, or which of the 5 repos owns a given feature.
---

# Degreed Platform Architecture

## Overview

Degreed is an enterprise learning experience platform (LXP). This workspace contains 5 repositories forming the complete AI-powered learning stack. The platform powers AI coaching, intelligent assistants, roleplay simulations, quiz generation, and admin experience building tools.

## Multi-Repo Structure

```
maestro_repo_paperclip/
├── Degreed/                    # .NET Backend (ASP.NET Core) - API gateway, auth, data
├── fe-workspace/               # Angular 20 Web Frontend (Nx monorepo)
├── degreed-flutter/            # Flutter Mobile App (iOS/Android)
├── degreed-coach-builder/      # Python Maestro Service (Experiences AI engine)
├── degreed-assistant/          # Python Assistant Service (Quick Actions AI)
└── clusters/                   # Infrastructure/deployment configs (K8s, Helm)
```

## Detailed Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  Angular (fe-workspace)  │  Flutter (degreed-flutter)           │
│  - NgxHttpClient wrapper │  - Dio HTTP client                   │
│  - SSE via EventSource   │  - DegreedCubit state mgmt           │
│  - Signal-based state    │  - SSE via flutter_client_sse        │
│  - LiveKit WebRTC SDK    │  - LiveKit Flutter SDK               │
└────────────┬─────────────┴────────────┬─────────────────────────┘
             │                          │
             ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    .NET BACKEND (Degreed/)                       │
│  Route: /api/*                                                  │
│                                                                 │
│  Controllers:                                                   │
│  - CoachController (/api/coach/*)                               │
│  -   Connect, Chat SSE, RegisterCall, Conversations, Messages   │
│  -   Feedbacks, Inferences, Recommendations, Summaries          │
│  - DegreedAssistantController (/api/assistant/*)                │
│  -   Flows, Connect, Chat SSE                                   │
│  - MaestroController (/api/maestro/*)                           │
│  -   Experience CRUD, Coach/Quiz/Roleplay builder endpoints     │
│                                                                 │
│  Orchestrators:                                                 │
│  - CoachOrchestrator → forwards to degreed-coach-builder        │
│  - DegreedAssistantOrchestrator → forwards to degreed-assistant │
│                                                                 │
│  Auth: Cookie (identity.v4), Bearer token, CSRF, X-Internal-Key│
│  Named HttpClients: "CoachAIBackend" (600s timeout),            │
│                     "DegreedAssistant" (600s timeout)            │
│  Streaming: SendSseRequestAsync() pipes SSE through to client   │
└────────┬──────────────────────────────┬─────────────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────────┐  ┌──────────────────────────────────────┐
│  degreed-assistant   │  │  degreed-coach-builder (Maestro)     │
│  Route: /dgassistant │  │  Route: /dgcb                        │
│                      │  │                                      │
│  FastAPI + LangChain │  │  FastAPI + Azure OpenAI SDK          │
│                      │  │                                      │
│  Scopes:             │  │  Features:                           │
│  - Curate pathway    │  │  - Coach (text + voice)              │
│  - Find content      │  │  - Roleplay (text + voice)           │
│  - Update skills     │  │  - Quiz generation                   │
│  - Recommend to team │  │  - Experience Builder (admin)        │
│                      │  │  - RAG file upload                   │
│  Tools:              │  │  - Post-processing (Kirkpatrick)     │
│  - Pathway_Creator   │  │                                      │
│  - find_content      │  │  Voice: LiveKit WebRTC agents        │
│  - addUserSkills     │  │  Streaming: SSE for text             │
│  - RecommendResources│  │  Prompts: Strategy pattern (1791 LOC)│
│  - splitter, getGroup│  │  Tools: Create_Coach, Create_Quiz    │
└──────────┬───────────┘  └──────────┬───────────────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED INFRASTRUCTURE                         │
│                                                                 │
│  Azure OpenAI:                                                  │
│  - GPT-5.1 (primary) with GPT-4o fallback                      │
│  - gpt-4o-realtime-preview (voice via LiveKit)                  │
│  - text-embedding-3-large (embeddings)                          │
│                                                                 │
│  Redis (Multiple Layers):                                       │
│  - Standard Redis: session data, coach metadata, token cache    │
│  - Azure Managed Redis: vector store, RAG embeddings            │
│  - Lua scripts for atomic operations (thread-safe updates)      │
│  - 24-hour session TTL                                          │
│                                                                 │
│  LiveKit:                                                       │
│  - WebRTC for real-time voice/video                             │
│  - BaseVoiceAgent → CoachAgent (RAG-enabled)                    │
│  -                → RolePlayAgent (time-managed, scoring)       │
│  - Azure Speech STT/TTS plugins                                 │
│  - Session time warnings at 70%, 90%, 100%                      │
│                                                                 │
│  Observability:                                                 │
│  - Datadog APM + custom DogStatsD metrics                       │
│  - Distributed tracing across all services                      │
│  - Prometheus metrics endpoint at /dgcb/metrics                 │
│  - Structured JSON logging with PII masking                     │
│                                                                 │
│  Feature Flags: LaunchDarkly (frontend + backend)               │
│  Config: Azure App Configuration + Key Vault                    │
│  Deploy: AKS (Kubernetes), Docker, Helm, GitHub Actions         │
└─────────────────────────────────────────────────────────────────┘
```

## Cross-Service Communication Patterns

### .NET → Python (Forward Path)
1. **Coach Connect**: `POST /dgcb/api/sse/llm-text-connect/{sessionId}` — enriched with user profile, interests, inferences, previous messages, pathway details
2. **Coach Chat SSE**: `GET /dgcb/api/sse/llm-text-sse/{sessionId}` — streams tokens via SSE
3. **Voice Register**: `POST /dgcb/api/realtime/register-realtime-call` — returns LiveKit access token + room URL
4. **Assistant Connect**: `POST /dgassistant/connect` — sends session_id, scope, query, user context
5. **Assistant Chat SSE**: `GET /dgassistant/chat?session_id={id}` — streams via SSE
6. **Builder Fill**: `POST /dgcb/api/coach_builder/fill-coach-fields` — AI auto-generates coach config
7. **Builder Validate**: `POST /dgcb/api/coach_builder/validate-coach-fields` — validates experience config
8. **Quiz Fill**: `POST /dgcb/api/quiz_builder/fill-quiz-fields` — generates quiz from topics/documents
9. **Post-Process**: `POST /dgcb/api/post_process/extract_conversation_info_v2` — extracts 11 insight types
10. **RAG Upload**: `POST /dgcb/api/rag/upload-files` — uploads docs for knowledge base

### Python → .NET (Callback Path)
Python services call .NET APIs on behalf of authenticated users using stored cookies:
- **DegreedApiService** (coach-builder): centralized client with EndpointRegistry, auto web/mobile routing, retry logic, camelCase normalization
- **AgentUtils** (assistant): 1800+ LOC class with tools for Pathway_Creator, find_content, addUserSkills, updateUserProfileTagRatings, RecommendResources, splitter, getGroups, JoinGroup

### Authentication Flow
1. Client sends cookies/tokens → .NET validates identity
2. .NET enriches request with user profile, org context, permissions
3. .NET forwards to Python with Bearer token + X-Internal-Key header
4. Python stores cookies in Redis keyed by session_id
5. Python uses stored cookies to call .NET APIs as the authenticated user
6. CSRF tokens auto-extracted via `extract_token_and_add_crsf()`

## Key Configuration
- `DGAICoachBackendURL` — base URL for coach-builder service
- `DGAssistantURL` — base URL for assistant service
- `MaestroInternalApiKeyConfigName` — internal API key for service-to-service auth
- Both HttpClients: 600s timeout for long-running AI operations
- Feature flags control feature access per org/user via LaunchDarkly

## Database Architecture
- **SQL Server**: Primary data store (.NET) — users, content, pathways, skills, orgs, coach configs, conversations, messages, inferences, recommendations, summaries
- **Redis Standard**: Session cache, coach metadata, token cache, chat history
- **Azure Managed Redis**: Vector store for RAG embeddings, semantic search with re-ranking
- **Key patterns**: `session_{id}`, `coach_{id}`, `conversation_{id}`, `file_ids_{id}`, `token_cache_{user_id}`
