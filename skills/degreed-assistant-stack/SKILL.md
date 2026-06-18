---
name: degreed-assistant-stack
description: Use when working in the degreed-assistant Python/FastAPI service (DGA) — its LangChain tools, AgentUtils, scopes, Azure OpenAI calls, Redis conversation memory, or callbacks into the .NET API.
---

# degreed-assistant Stack Guide

## Overview
Python FastAPI service powering Degreed's AI assistant for quick actions. Uses LangChain for prompt engineering, tool orchestration, and chain-of-thought reasoning. Connects to Azure OpenAI for LLM inference and calls back into the .NET API to execute actions on behalf of users.

## Tech Stack
- **Runtime**: Python 3.11, FastAPI (async)
- **AI Framework**: LangChain 0.3.x (prompts, chains, memory, tools, output parsers)
- **LLM**: Azure OpenAI (GPT-4o, GPT-5.1 with fallback)
- **Embeddings**: Azure text-embedding-3-large (Ada Large)
- **Session**: Redis (chat history, session state)
- **Observability**: Datadog (ddtrace), structured logging
- **Root path**: `/dgassistant`

## Project Structure
```
degreed-assistant/
├── backend/
│   ├── application.py              # FastAPI main app, /dgassistant root (19KB)
│   │   └── ConnectRequest model:   session_id, scope, query, host, cookies
│   │   └── ScopeEnum:              4 validated scope values
│   │   └── Endpoints:
│   │       POST /dgassistant/connect    → establish session
│   │       GET  /dgassistant/chat       → SSE streaming (session_id param)
│   │       GET  /dgassistant/healthcheck
│   │       GET  /dgassistant/readiness
│   │
│   ├── genai/                       # Core AI logic
│   │   ├── intent_classifier.py     # Single file — classifies user intent to scope
│   │   ├── response_builder.py      # Response formatting
│   │   ├── extended_redis_chat_history.py  # Custom Redis chat memory
│   │   ├── prompts/                 # Consolidated prompt templates
│   │   │   ├── prompt_and_description.py    # Current prompt templates
│   │   │   ├── prompt_and_description_v1.py # V1 prompt templates
│   │   │   └── prompt_and_description_v2.py # V2 prompt templates
│   │   ├── tools_and_chains/
│   │   │   ├── agent_utils.py       # AgentUtils class (1,825 LOC) — ALL tool methods
│   │   │   ├── llm_client.py        # Azure OpenAI client configuration
│   │   │   └── tool_chains.py       # LangChain chain orchestration + memory
│   │   ├── llm/                     # LLM configuration
│   │   └── v1/                      # Next-gen graph-based agent architecture
│   │       ├── graph/               # LangGraph-based agent graphs
│   │       ├── middleware/           # V1 middleware
│   │       ├── services/            # V1 services
│   │       └── tests/               # V1 tests
│   │
│   ├── api/                         # .NET API wrappers — directory-based organization
│   │   ├── content/                 # find_learning_resources.py, get_input_content.py, get_suggested_resource.py
│   │   ├── pathway/                 # create_pathway.py, add_pathway_section_and_populate.py, get_pathway.py, etc.
│   │   ├── tag/                     # create_tag.py, find_a_tag.py, get_user_profile_tags.py, rate_tag.py
│   │   ├── user/                    # get_authenticated_user.py, get_user.py, user_focus.py
│   │   ├── group/                   # find_groups.py, join_group.py
│   │   ├── managers/                # add_recomendations.py (recommends to direct reports)
│   │   ├── targets/                 # get_suggested_titles.py
│   │   ├── org/                     # Organization API wrappers
│   │   ├── profile/                 # User profile API
│   │   ├── search_mentor/           # Mentor search API
│   │   ├── rules/                   # Business rules API
│   │   └── api_utils/               # Shared API utilities
│   │
│   ├── tools.py                     # Tool definitions (12KB)
│   ├── utils.py                     # Shared utilities (16KB) — Redis, auth, logging
│   │
│   ├── config/                      # Configuration
│   │   ├── app_config.py            # Application configuration
│   │   ├── azure_config.py          # Azure OpenAI settings
│   │   ├── llm_client.py            # LLM client factory
│   │   └── log_config.py            # Structured logging with DD tracing
│   │
│   ├── sockets/                     # WebSocket support
│   │   ├── connection_manager.py    # WebSocket connection management
│   │   └── sockets.py               # Socket endpoints
│   │
│   ├── storage/                     # Storage layer
│   ├── tests/                       # Test suite (79 test files)
│   └── requirements.txt             # Dependencies
```

## Four Scopes (Quick Actions)
Each scope maps to specific LangChain tools and prompt chains:

| Scope | Description | Key Tools | .NET APIs Called |
|-------|-------------|-----------|-----------------|
| `Curate pathway` | AI creates a structured learning pathway | Pathway_Creator, find_content | Pathway CRUD, Content Search |
| `Find skill-related content` | Searches and recommends learning resources | find_content_request_sender | Content Search, Suggested Resources |
| `Update your skills` | Manages user skill profile | addUserSkills, updateUserProfileTagRatings, addFocusSkill | Tag Find/Create/Rate, User Profile |
| `Recommend content to my team` | Manager recommends resources to direct reports | RecommendResources, getGroups | Manager Reports, Content Search, Group APIs |

## AgentUtils Deep Dive (agent_utils.py — 1,825 LOC)
This is the core class. Key patterns:
- **LangChain PromptTemplate** for each tool with input variables and few-shot examples
- **Azure OpenAI embeddings** for semantic search (text-embedding-3-large)
- **Redis chat history** via `ExtendedRedisChatMessageHistory` (custom extension in `extended_redis_chat_history.py`)
- **Memory**: Both `ConversationBufferMemory` and `ConversationBufferWindowMemory` used (imported from LangChain)
- **Tool registration**: Each method decorated as a LangChain Tool with name + description
- **Error handling**: Graceful fallbacks with user-friendly error messages
- **Streaming**: Yields tokens via async generators for SSE delivery
- **Session context**: Reads user profile, org context, previous interactions from Redis
- **Chain orchestration**: `tool_chains.py` manages LLMChain execution and memory integration

## SSE Streaming Pattern
```
1. Frontend POST /api/assistant/Connect → .NET enriches with user context
2. .NET POST /dgassistant/connect → Python creates session in Redis
3. Frontend GET /api/assistant/Chat?session_id={id} → .NET pipes SSE
4. .NET GET /dgassistant/chat?session_id={id} → Python streams
5. Python: intent classify → select scope → run LangChain chain → stream tokens
6. Response format: { "Is_final": bool, "suggestions": [], "response": "...", "error": null }
7. Final message includes suggestions for follow-up actions
```

## LangChain Integration Patterns
- **Chains**: Sequential chains for multi-step reasoning (classify → plan → execute → format)
- **Memory**: ConversationBufferMemory backed by Redis for session persistence
- **Tools**: Custom tool definitions with schemas for structured function calling
- **Prompts**: PromptTemplate with input_variables, partial_variables for dynamic context injection
- **Output Parsers**: Structured output parsing for consistent response formats
- **Callbacks**: Streaming callbacks for token-by-token SSE delivery

## Configuration
- `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_VERSION`
- `AZURE_OPENAI_DEPLOYMENT_NAME` (GPT model), `AZURE_EMBEDDING_DEPLOYMENT` (embeddings)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `DD_SERVICE=degreed-assistant`, `DD_AGENT_HOST` (Datadog)
- Session cookies forwarded via `X-Cookie` and `X-Host` custom headers from .NET
