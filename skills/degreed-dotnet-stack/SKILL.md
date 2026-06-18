---
name: degreed-dotnet-stack
description: "Degreed .NET backend stack guide — controllers, orchestrators, domain models, auth, SQL. Use when working in the .NET backend."
---

# Degreed .NET Backend Stack Guide

## Overview
ASP.NET Core backend — the API gateway for the entire Degreed platform. Handles authentication, authorization, business logic, data persistence (SQL Server), and proxies AI requests to the two Python services. All frontend requests (Angular + Flutter) hit .NET first.

## Tech Stack
- **Framework**: ASP.NET Core, C#
- **Database**: SQL Server (primary data store)
- **Cache**: Redis
- **Solution**: `Degreed/trunk/Degreed.All.sln`
- **Key Projects**:
  - `Degreed.Web.vNext` — Main web service, controllers, middleware
  - `Degreed.Common.Standard` — Business logic, orchestrators, models, DI
  - `Degreed.Data.Standard` — Data access layer, domain models
  - `Degreed.GenAI` — GenAI client implementations
  - `Degreed.Authorization` — Authorization service
  - `Degreed.IdentityService` — Identity management

## AI Controllers (Frontend-Facing Endpoints)

### CoachController (`/api/coach`)
File: `Degreed.Web.vNext/Controllers/Api/CoachController.cs`
Protected by `[ValidateCoachAccess]` — checks Maestro feature flag + permissions.

```
# Session Management
POST /api/coach/Connect                    → Stream JSON (CoachOrchestrator.HandleConnectRequestAsync)
GET  /api/coach/Chat/{sessionId}           → SSE stream (CoachOrchestrator.HandleChatRequestAsync)
POST /api/coach/RegisterCall               → Register voice call (returns CallId, AccessToken, SocketUrl)
GET  /api/coach/ValidateCoachAccess        → Verify coach access
GET  /api/coach/AudioMetaData              → Audio metadata

# Coach CRUD
GET  /api/coach/List                       → List coaches
GET  /api/coach/Get/{coachId}              → Get coach by ID
GET  /api/coach/{coachId}/ResourceRecommendations → Resource recommendations

# Conversation Management
GET  /api/coach/Conversations              → List with filters
GET  /api/coach/{coachId}/Conversations/{conversationId} → Get details
POST /api/coach/Conversations/Create       → Create conversation
PUT  /api/coach/Conversations/Update       → Update conversation
PUT  /api/coach/Conversations/UpdatePartial → Partial update
PUT  /api/coach/v1/Conversations/Update    → Update with API request tracking
PUT  /api/coach/v1/Conversations/UpdatePartial → Partial with tracking
PUT  /api/coach/ConversationSummary/Update → Update summary
DELETE /api/coach/Conversations/Delete/{id} → Delete

# Message Management
GET  /api/coach/Messages/Conversation/{id} → Get messages
POST /api/coach/Messages/Create            → Create message
POST /api/coach/Messages/BulkCreate        → Bulk create
DELETE /api/coach/Messages/Delete/{id}     → Delete

# Feedback
GET  /api/coach/Feedbacks/Options          → Feedback options
GET  /api/coach/Feedbacks/Message/{id}     → Message feedback
POST /api/coach/Feedbacks/Create           → Create feedback
DELETE /api/coach/Feedbacks/Delete/{id}    → Delete

# Inference / Skill Extraction
GET  /api/coach/Inferences/Conversation/{id} → Get inferences
GET  /api/coach/Inferences/SkillReview     → Skill review inference
GET  /api/coach/Inferences/UserFeedback    → User feedback inference
POST /api/coach/Inferences/Create          → Create inference
DELETE /api/coach/Inferences/Delete/{id}   → Delete

# Recommendations
GET  /api/coach/Recommendations/Coach/{coachId}
GET  /api/coach/Recommendations/Conversation/{conversationId}
POST /api/coach/Recommendations/Create
POST /api/coach/Recommendations/BulkCreate
DELETE /api/coach/Recommendations/Delete/{id}

# Summaries
GET  /api/coach/Summaries/Coach/{coachId}
GET  /api/coach/Summaries/Conversation/{id}
GET  /api/coach/Summaries/Conversation/{id}/pdf  → Download PDF
POST /api/coach/Summaries/Create
DELETE /api/coach/Summaries/Delete/{id}

# Aggregated
GET  /api/coach/InferencesPlansTasks       → Combined data
```

### DegreedAssistantController (`/api/assistant`)
File: `Degreed.Web.vNext/Controllers/Api/DegreedAssistantController.cs`
Checks `IsDegreedAssistantEnabledAsync()` — Maestro flag + scope permissions.

```
GET  /api/assistant/Flows                  → Available assistant flows (scopes)
POST /api/assistant/Connect                → Stream JSON (DegreedAssistantOrchestrator.ConnectAsync)
GET  /api/assistant/Chat?session_id={id}   → SSE stream (DegreedAssistantOrchestrator.ChatAsync)

# API Request Tracking (for experience builders)
GET  /api/assistant/Requests/{requestId}/{eventType}
POST /api/assistant/Requests/Create
PUT  /api/assistant/Requests/Update
DELETE /api/assistant/Requests/Delete/{requestId}
```

### MaestroController (`/api/maestro`)
Experience Builder admin endpoints for CRUD on coaches, quizzes, roleplays.

### Mobile Variants
- `Controllers/Api/Mobile/CoachController.cs` — Mobile coach endpoints
- `Controllers/Api/Mobile/DegreedAssistantController.cs` — Mobile assistant endpoints

## Orchestrators (Python Service Integration)

### CoachOrchestrator
File: `Degreed.Common.Standard/Orchestrators/CoachOrchestrator.cs`

```csharp
// Text Chat Flow
HandleConnectRequestAsync(CoachConnectRequest) {
    // 1. Enriches request with: user profile, interests, inferences, previous messages, pathway details
    // 2. POST {DGAICoachBackendURL}/dgcb/api/sse/llm-text-connect/{sessionId}
    //    with Bearer auth + X-Internal-Key
    // 3. Returns stream as File(stream, "application/json")
}

HandleChatRequestAsync(sessionId, cookies, host) {
    // 1. GET {DGAICoachBackendURL}/dgcb/api/sse/llm-text-sse/{sessionId}
    //    via SendSseRequestAsync() — pipes SSE, filters ping-pong
    // 2. Returns Results.Stream(streamAction, "text/event-stream")
}

HandleRegisterRequestAsync(CoachRegisterRequest) {
    // POST {DGAICoachBackendURL}/dgcb/api/realtime/register-realtime-call
    // Returns CoachRegisterResponse { CallId, AccessToken, SocketUrl }
}

// Builder endpoints
FillCoachAsync()    → POST /dgcb/api/coach_builder/fill-coach-fields
ValidateCoachAsync() → POST /dgcb/api/coach_builder/validate-coach-fields
```

### DegreedAssistantOrchestrator
File: `Degreed.Common.Standard/Orchestrators/DegreedAssistantOrchestrator.cs`

```csharp
ConnectAsync(ConnectModel) {
    // POST {DGAssistantURL}/dgassistant/connect
    // Returns stream
}

ChatAsync(sessionId, cookies, host) {
    // GET {DGAssistantURL}/dgassistant/chat?session_id={id}
    //    Custom headers: X-Cookie, X-Host
    //    Pipes SSE, filters ping-pong messages
}

IsDegreedAssistantEnabledAsync(userProfileKey, organizationId)
    // Checks Maestro feature flag + user permissions
```

## Route Definitions (Python Backend URLs)
File: `Degreed.Common.Standard/Constants/CoachAIBackendRoutes.cs`

```csharp
// Coach Builder (degreed-coach-builder)
ClientName = "CoachAIBackend"
ConfigKey = "DGAICoachBackendURL"
Prefix = "/dgcb"

// SSE routes
/dgcb/api/sse/llm-text-connect/{sessionId}
/dgcb/api/sse/llm-text-sse/{sessionId}

// Realtime routes
/dgcb/api/realtime/register-realtime-call
/dgcb/api/realtime/register-roleplay-call

// Builder routes
/dgcb/api/coach_builder/fill-coach-fields
/dgcb/api/coach_builder/validate-coach-fields
/dgcb/api/coach_builder/validate-quiz-values
/dgcb/api/coach_builder/validate-roleplay-fields
/dgcb/api/coach_builder/configurations
/dgcb/api/coach_builder/deep-clone

// Quiz routes
/dgcb/api/quiz_builder/fill-quiz-fields
/dgcb/api/quiz_builder/quiz-inference

// Post-process
/dgcb/api/post_process/extract_conversation_info
/dgcb/api/post_process/extract_conversation_info_v2

// RAG
/dgcb/api/rag/upload-files-v1
/dgcb/api/rag/quiz-file-upload
/dgcb/api/rag/delete-files

// Degreed Assistant
ClientName = "DegreedAssistant"
ConfigKey = "DGAssistantURL"
Prefix = "/dgassistant"
/dgassistant/connect
/dgassistant/chat?session_id={sessionId}
```

## HTTP Client Configuration
File: `Degreed.Common.Standard/DependencyInjection/IocPackage.cs`

```csharp
// Named HttpClients with 600s (10 min) timeout:
services.AddHttpClient("CoachAIBackend", client => {
    client.Timeout = TimeSpan.FromSeconds(600);
    client.DefaultRequestHeaders.Add("X-Internal-Key", internalApiKey);
});
services.AddHttpClient("DegreedAssistant", client => {
    client.Timeout = TimeSpan.FromSeconds(600);
});
```

## Key Request/Response Models
File: `Degreed.Common.Standard/Models/CoachConnectParameters.cs`

```csharp
CoachConnectRequest : BaseConnectRequest {
    SessionId, CoachId, Coach (metadata), UserProfile, UserInterests,
    ConversationId, Inferences, PreviousMessages, TimeZone,
    Skill (dict), Event, Prompt, CorrelationId, PathwayId, PathwayDetails
}

CoachRegisterRequest : BaseConnectRequest {
    SessionId, AgentType ("Coach"), CoachId, Coach, UserProfile,
    UserInterests, ConversationId, Inferences, PreviousMessages,
    SampleRate (voice), TimeZone, Skill, PathwayId, PathwayDetails,
    SkillReviewInferences
}

CoachRegisterResponse { CallId, AccessToken, SocketUrl }

// Assistant
ConnectModel : DgaBaseConnectRequest {
    session_id, correlation_id, scope, audio, query
}
DgaBaseConnectRequest {
    user_profile_key, organization_id, cookies (dict), host
}
```

## Authentication & Authorization
- **ValidateCoachAccessAttribute**: Filter checks user auth + Maestro feature flag + permissions (`UseMaestroExperiencesTextConversations` OR `UseMaestroExperiencesVoiceConversations`)
- **Assistant permissions**: Per-scope — `UseMaestroQuickActionsFindSkillRelatedContent`, `UseMaestroQuickActionsCuratePathway`, `UseMaestroQuickActionsUpdateYourSkills`, `UseMaestroQuickActionsRecommendContentToMyTeam`
- **Bearer token propagation**: `SendWithAuthAsync()` adds `Authorization: Bearer {token}`
- **Internal API key**: `X-Internal-Key` header for coach-builder service-to-service auth
- **User context**: `User.UserProfileKey()`, `User.OrganizationId()`, `User.IsAuthenticated()`

## Domain Models (SQL Server)
Directory: `Degreed.Data.Standard/Domain/Coach/`
- `Coach.cs` — Coach configuration and metadata
- `Conversation.cs` — Chat conversation records
- `ConversationMessage.cs` — Individual messages
- `MessageFeedback.cs` — User feedback on messages
- `UserCoachConversationInference.cs` — AI-extracted skills/data
- `Recommendation.cs` — Resource recommendations
- `Summary.cs` — Conversation summaries
- `CoachFeedbackLevel.cs`, `CoachFeedbackRubric.cs` — Feedback configuration
- `CoachPersona.cs`, `CoachSkill.cs` — Coach configuration
- `DegreedAssistantFlow.cs` — Assistant flow definitions
- `ApiRequest.cs` — Tracks async API requests for experience builders

## SSE Streaming Pattern
```
1. .NET receives SSE request from frontend
2. Calls Python via SendSseRequestAsync()
3. Python streams tokens as text/event-stream
4. .NET wraps in StreamAction, filters "data: ping-pong" keep-alive messages
5. Returns to browser as text/event-stream
6. All within 600s timeout window
```
