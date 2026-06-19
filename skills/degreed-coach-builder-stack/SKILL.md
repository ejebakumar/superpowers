---
name: degreed-coach-builder-stack
description: Use when working in the degreed-coach-builder Python/FastAPI service (Maestro) — its LLM/LangChain layer, prompt strategies, RAG, LiveKit voice worker, quiz generation, agents framework, or Redis state.
---

# degreed-coach-builder (Maestro) Stack Guide

## Overview
Python FastAPI service — "The Heart and Soul of Maestro." Powers all Degreed Experiences: Coach (text + voice), Roleplay (text + voice), Quiz generation, and the Experience Builder admin tool. ~93,813 LOC Python, 22 major modules, 250+ API endpoints, full async architecture.

## Tech Stack
- **Runtime**: Python 3.12, FastAPI (full async/await)
- **LLM**: Azure OpenAI SDK (GPT-5.1 primary, GPT-4o fallback), NOT LangChain
- **Voice**: LiveKit (livekit-agents 1.4.4) + Azure Speech STT/TTS
- **Realtime Model**: gpt-4o-realtime-preview-2024-12-17
- **Embeddings**: text-embedding-3-large via Azure
- **Session/Cache**: Redis (standard) + Azure Managed Redis (vector store)
- **Observability**: Datadog (ddtrace 3.6.0) + Prometheus + structured JSON logging
- **Root path**: `/dgcb`

## Project Structure (Key Files with LOC)
```
degreed-coach-builder/backend/app/
├── server.py                        # FastAPI app init, middleware, routes
├── config.py                        # App configuration
├── log_manager.py                   # Structured logging (27,960 bytes)
│
├── api/                             # API Endpoints
│   ├── __init__.py                  # Router registration (all prefixes)
│   ├── sse.py                       # SSE text coaching endpoints
│   │   POST /dgcb/api/sse/llm-text-connect/{session_id}  # Init session
│   │   GET  /dgcb/api/sse/llm-text-sse/{sessionId}       # Stream tokens
│   ├── realtime.py (66,222 bytes)   # Voice registration endpoints
│   │   POST /dgcb/api/realtime/register-coach-call
│   │   POST /dgcb/api/realtime/register-roleplay-call
│   │   POST /dgcb/api/realtime/register-realtime-call
│   ├── conversation_starter.py      # POST /dgcb/api/coach_builder/configurations
│   ├── fill_coach_fields.py         # POST /dgcb/api/coach_builder/fill-coach-fields
│   ├── validate_fill_coach.py       # POST /dgcb/api/coach_builder/validate-coach-fields
│   │                                # POST /dgcb/api/coach_builder/validate-coach-injection-fields
│   │                                # POST /dgcb/api/coach_builder/validate-roleplay-fields
│   ├── fill_quiz_fields.py          # POST /dgcb/api/quiz_builder/fill-quiz-fields
│   │                                # POST /dgcb/api/quiz_builder/quiz-inference
│   ├── deep_clone.py                # POST /dgcb/api/coach_builder/deep-clone
│   ├── post_process.py              # POST /dgcb/api/post_process/extract_conversation_info
│   ├── post_process_v2.py           # POST /dgcb/api/post_process/extract_conversation_info_v2
│   ├── upload_files.py              # POST /dgcb/api/rag/upload-files (v2)
│   ├── upload_files_v1.py           # POST /dgcb/api/rag/upload-files-v1 (legacy)
│   ├── livekit_rooms.py             # GET /dgcb/api/livekit/list-rooms
│   ├── config_cache.py              # DELETE /dgcb/api/config/cache/{org_id}
│   ├── redis_monitoring.py          # Azure Managed Redis health/auth endpoints
│   └── v1/
│       └── prepare_guardrails.py    # Guardrails API
│
├── llm/                             # LLM & Prompt Engineering
│   ├── llm.py (654 LOC)            # LlmClient — manages all LLM interactions
│   │   └── SessionContext, token counting (tiktoken), Redis caching
│   │   └── Tool integration: Coach, Quiz, ShowDifficultyButtons
│   ├── llm_client.py               # Azure OpenAI client factory
│   │   └── create_azure_async_client() — 40s timeout
│   │   └── get_azure_config() — dynamic GPT-5.1 → GPT-4o fallback
│   │   └── is_newer_model() — API version detection (max_completion_tokens vs max_tokens)
│   ├── prompt.py (1,791 LOC)       # Master coach system instructions
│   │   └── Default Instructions, Engagement Strategies, Support/Motivation
│   │   └── Previous Session Knowledge (Context, Feedback, Behavior, Preferences)
│   │   └── Profile Display (MUST override word limits)
│   │   └── PATHWAY_PROMPT_TEMPLATE, PLAN_PROMPT_TEMPLATE
│   ├── prompt_2.py (1,623 LOC)     # Alternative prompt templates
│   ├── roleplay_prompts.py (86 LOC) # Roleplay system with 3-layer guardrails
│   │   └── ROLEPLAY_PROMPT_PRECEDENCE: System > Platform > User guardrails
│   ├── generate_prompt.py (556 LOC) # Content generation prompts
│   ├── tools/
│   │   ├── llm_tools.py (682 LOC)  # Tool definitions (OpenAI function schema)
│   │   └── tools.py (743 LOC)      # Tool implementations
│   │       └── Create_Coach: generate coach from conversation
│   │       └── Create_Quiz: generate quiz from doc/topic
│   │       └── Show_Difficulty_Buttons: UI helper
│   └── prompt_strategies/           # Strategy Pattern for prompt generation
│       ├── strategy_factory.py (186 LOC)  # Factory with lazy loading
│       ├── coach_strategy.py (205 LOC)    # Text & voice coaching
│       ├── roleplay_strategy.py (202 LOC) # Roleplay scenarios
│       ├── generate_strategy.py (318 LOC) # Content generation
│       ├── session_context.py (232 LOC)   # Session state management
│       ├── utils.py (374 LOC)             # Shared utilities
│       ├── coach_components/
│       │   ├── data_fetcher.py (654 LOC)     # Fetches coach context
│       │   ├── skill_proficiency.py (210 LOC) # Skill assessment
│       │   ├── template_selector.py (350 LOC) # Template selection logic
│       │   └── prompt_builder.py (333 LOC)    # Builds final prompts
│       └── roleplay_components/
│           └── prompt_builder.py (168 LOC)    # Roleplay prompt assembly
│
├── dg_component/                    # Degreed Platform Integration
│   ├── api_service/
│   │   ├── degreed_api_service.py   # Centralized API client
│   │   │   └── Auto web/mobile endpoint routing
│   │   │   └── Retry logic with configurable delays
│   │   │   └── Response normalization (camelCase)
│   │   ├── endpoint_registry.py     # All .NET API paths
│   │   │   └── Web: /api/coaches/{id}, /api/conversations/...
│   │   │   └── Mobile: /api/mobile/v2/...
│   │   │   └── Admin: /api/admin/...
│   │   └── response_adapters.py     # snake_case → camelCase, pagination
│   ├── coach/coach.py (89 LOC)     # get_coach(sid, coach_id)
│   ├── roleplay/roleplay.py (56 LOC) # get_roleplay(sid, roleplay_id)
│   ├── experience.py               # Experience service
│   ├── find_content/find_learning_resources.py (80 LOC)  # Search + re-ranking
│   ├── mentor/mentor.py (80 LOC)   # Skills-based mentor matching
│   └── pathway/pathway.py (44 LOC) # Pathway metadata retrieval
│
├── realtime/                        # LiveKit Real-time Voice Agents
│   ├── agents.py                    # Voice agent classes
│   │   ├── BaseVoiceAgent(Agent)    # Base with transcript management
│   │   ├── CoachAgent(BaseVoiceAgent)   # RAG-enabled voice coach
│   │   ├── RolePlayAgent(BaseVoiceAgent) # Time-managed with scoring
│   │   ├── create_rag_tool()        # RAG tool factory (quorum=3, timeout=2.5s)
│   │   └── create_end_call_tool()   # Session termination
│   ├── config.py                    # Session configuration
│   ├── session_timer.py             # Time warnings: 70%, 90%, 100%
│   └── transcription.py            # Transcript handling
│
├── quiz/                            # Quiz Generation Pipeline
│   ├── service.py                   # QuizService facade
│   │   └── generate_from_topics(), generate_from_files(), regenerate_quiz()
│   ├── core/
│   │   ├── orchestrator.py          # Main orchestration
│   │   ├── pipeline.py              # Pipeline execution
│   │   ├── events.py                # Event bus for progress
│   │   └── config.py                # Configuration
│   ├── generators/
│   │   ├── batch_processor.py       # Batch processing
│   │   ├── file_generator.py        # Generate from files
│   │   ├── topic_generator.py       # Generate from topics
│   │   └── regenerator.py           # Regenerate existing quizzes
│   ├── file_processing/
│   │   ├── chunker.py               # Document chunking
│   │   ├── topic_extractor.py       # Topic extraction
│   │   └── coverage.py              # Topic coverage distribution
│   ├── deduplication/
│   │   ├── semantic_dedup.py        # LLM-based semantic similarity
│   │   ├── llm_filter.py            # LLM filtering
│   │   └── quality_scorer.py        # Quality evaluation
│   ├── validation/
│   │   ├── pipeline.py              # Validation orchestration
│   │   ├── validators/structure.py  # Question structure validation
│   │   ├── validators/content.py    # Content validation
│   │   ├── validators/difficulty.py # Difficulty validation
│   │   └── auto_fixer.py            # Automatic repair
│   └── progress/
│       ├── tracker.py               # Progress monitoring
│       └── estimator.py             # Time/token estimation
│
├── db/                              # Database & Caching
│   ├── redis_manager.py             # Unified SessionDataModel store
│   │   └── store_unified_session() — consolidates 7+ separate keys
│   │   └── get_coach_data(), add_object(), get_object()
│   │   └── 24-hour session TTL
│   ├── redis_client.py              # Standard Redis client
│   ├── redis_vector_client.py       # Azure Managed Redis vector store
│   ├── redis_rag.py                 # RAG operations (search, embed, rerank)
│   └── redis_atomic_scripts.py      # Lua scripts for thread-safe updates
│
├── models/
│   ├── redis_models.py              # SessionDataModel, embedded coach data
│   └── ai_structured_outputs.py     # Pydantic models for AI responses:
│       └── ConversationSummary, ConversationOneLiner, QuestionsAndResponses
│       └── SkillReview, NewSkillReview, QAndA, SkillAssessmentSummary
│       └── TaskItems, Feedback, EvaluationData
│       └── KirkpatrickEvaluation (Level 1-4)
│       └── UserFeedbackItem, Level1Reaction, Level2Learning, Level3Behavior, Level4Results
│
├── post_process/                    # Conversation Analysis (11 extraction types)
│   ├── extract_info_v3.py           # V3 extraction pipeline
│   └── extract_info_v4.py           # V4 extraction pipeline
│   └── Extracts: ConversationContext, Feedback, KirkpatrickEval,
│       OneLiner, Summary, Recommendations, TaskItems,
│       SkillReview, NewSkillReview, SkillAssessmentSummary, RoleplayFeedback
│   └── Status: Pending → Processing → Success/Failure/Timeout
│
├── services/
│   ├── guardrails/                  # Guardrail analysis
│   └── redis_scheduler.py           # Token refresh scheduler
│
├── utils/
│   ├── api_utils.py                 # setup_session_data(), helpers
│   ├── security_validation.py       # Auth, coach access, org membership
│   ├── security_exceptions.py       # SecurityValidationError
│   ├── masking_user_data.py         # PII masking for logs
│   ├── markdown_sanitizer.py        # HTML ↔ Markdown conversion
│   ├── role_to_skill.py             # Role → skill mapping
│   └── constants.py                 # Constants
│
├── metrics_tracking/
│   ├── dogstatsd_instrumentation_class.py  # DogStatsD metrics
│   └── instrumentation_class.py     # Generic instrumentation
│
├── core/
│   └── settings.py                  # Pydantic BaseSettings + Azure App Config
│       └── Azure Key Vault reference resolution
│       └── Label-based environment mapping
│       └── Fallback to .env file
│
└── tests/                           # 200+ tests
```

## Key Architectural Patterns

1. **Strategy Pattern** (Prompt Generation): `PromptStrategyFactory` creates CoachPromptStrategy, RoleplayPromptStrategy, or GeneratePromptStrategy with lazy loading
2. **Service Layer**: `DegreedApiService` centralizes all .NET backend calls with EndpointRegistry and response adapters
3. **RAG Pipeline**: Document → Chunk → Embed → Store in Redis Vector → Semantic Search → Re-rank → Inject into prompt. Quorum=3, timeout=2.5s
4. **Async Throughout**: All I/O async, `asyncio.gather()` for parallel execution, AsyncAzureOpenAI client
5. **Session-Scoped Multi-Tenancy**: Everything keyed by session_id, 24h TTL, embedded coach data, org isolation
6. **Three-Layer Guardrails**: System (non-overridable) > Platform (non-overridable) > User-defined

## Environment Variables
```
# Azure OpenAI (GPT 5.1 → GPT 4o fallback)
AZURE_GPT_5_1_API_KEY, AZURE_GPT_5_1_BASE_URL, AZURE_GPT_5_1_API_VERSION, AZURE_GPT_5_1_DEPLOYMENT_NAME
AZURE_GPT_4O_API_KEY, AZURE_GPT_4O_BASE_URL, AZURE_GPT_4O_API_VERSION, AZURE_GPT_4O_DEPLOYMENT_NAME
# Embeddings
AZURE_ADA_LARGE_API_KEY, AZURE_ADA_LARGE_BASE_URL
# LiveKit
LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
# Redis
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_SSL_ENABLED, USE_AZURE_REDIS
# Feature flags
RERANKING_ENABLED, ENABLE_PROMPT_LOGGING, LIVEKIT_VERBOSE
# DataDog
DD_API_KEY, DD_SERVICE=degreed-coach-builder, DD_AGENT_HOST
# Environment
SITE_ENV (Local|Staging|Production), AZURE_APP_CONFIG_URL
# Security
COOKIE_ENCRYPTION_KEY, MaestroEncryptionSecret
```
