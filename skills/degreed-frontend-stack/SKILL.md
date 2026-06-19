---
name: degreed-frontend-stack
description: "Degreed Angular frontend stack guide — Nx workspace, routing, Signals, services, Apollo design system. Use when working in the Angular frontend."
---

# Degreed Angular Frontend Stack Guide

## Overview
Angular 20 web application built as an Nx monorepo. Powers the entire Degreed LXP (Learning Experience Platform) UI, including AI features: Degreed Assistant chat, Skill Coach conversations, Experience Builder (Maestro Studio), Quiz, and Roleplay.

## Tech Stack
- **Framework**: Angular 20.3.18 + Nx 22.2.7
- **Build**: Angular DevKit (`@nx/angular:application`) — Vite used for some library builds only
- **State**: Angular Signals + RxJS + Facade pattern
- **HTTP**: Custom `NgxHttpClient` wrapper with interceptors
- **UI Libraries**: Apollo (design system), Fresco (component library/Storybook)
- **Real-time**: LiveKit WebRTC SDK, EventSource (SSE)
- **Feature Flags**: LaunchDarkly
- **i18n**: Translation service with locale support

## Workspace Structure
```
fe-workspace/
├── apps/
│   ├── lxp/                              # Main LXP application
│   │   └── src/app/
│   │       ├── degreed-coach/            # Coach + Assistant features
│   │       │   ├── degreed-assistant/    # DGA chat interface
│   │       │   │   ├── services/
│   │       │   │   │   └── degreed.assistant.service.ts  # SSE service
│   │       │   │   ├── maestro-conversation-page-v2.component.ts
│   │       │   │   ├── coach-dga-chat-conversation.component.ts
│   │       │   │   ├── coach-dga-card.component.ts
│   │       │   │   └── maestro-conversation-list.component.ts
│   │       │   ├── components/           # 40+ coach components
│   │       │   │   ├── coach-conversation-page-v2.component.ts    # Main chat UI
│   │       │   │   ├── coach-home-page-v2.component.ts            # Coach intro
│   │       │   │   ├── coach-explore-all.component.ts             # Browse coaches
│   │       │   │   ├── coach-conversation-input-v2.component.ts   # Chat input
│   │       │   │   ├── coach-conversation-v2.component.ts         # Virtualized messages
│   │       │   │   ├── coach-conversation-feedback.component.ts   # Feedback UI
│   │       │   │   ├── coach-summary-tab.component.ts             # Summary display
│   │       │   │   ├── coach-skill-report-tab.component.ts        # Skill assessment
│   │       │   │   ├── coach-skill-evaluation.component.ts        # Evaluation UI
│   │       │   │   ├── coach-recommendation.component.ts          # Recommendations
│   │       │   │   └── coach-voice-transcript-tab.component.ts    # Voice transcripts
│   │       │   ├── services/             # 11 core services
│   │       │   │   ├── coach-api.service.ts      # API communication (root singleton)
│   │       │   │   ├── coach-chat.service.ts      # Chat handling
│   │       │   │   ├── openai-realtime.service.ts # Voice/audio real-time
│   │       │   │   ├── voice-analysis.service.ts  # Voice analysis
│   │       │   │   ├── transcript.service.ts      # Speech-to-text
│   │       │   │   ├── conversation-polling.service.ts      # Async updates
│   │       │   │   ├── conversation-update-polling.service.ts
│   │       │   │   ├── maestro-experience-loader.service.ts # Experience loading
│   │       │   │   ├── network-monitoring.service.ts        # Network diagnostics
│   │       │   │   └── wcag-viewport.service.ts             # Accessibility
│   │       │   ├── facades/
│   │       │   │   └── coach-conversation.facade.ts  # Signal-based state orchestrator
│   │       │   │       Computed selectors: messages, inProgress, audioMode,
│   │       │   │       conversationId, activeCoach, showLoader, placeholderText,
│   │       │   │       showDrawer, viewRightPanel, rightPanelType, hasSummary,
│   │       │   │       isSkillReview, voiceModeEnabled, textModeEnabled
│   │       │   ├── store/
│   │       │   │   └── maestro.store.ts  # Global Maestro state (Signal-based)
│   │       │   │       state: { requestId }, setRequestId(), reset(), updateState()
│   │       │   ├── shared/
│   │       │   │   └── constants.ts      # All COACH_API endpoint constants
│   │       │   ├── models/               # TypeScript interfaces
│   │       │   │   ├── coach.model.ts    # Coach, conversation, feedback types
│   │       │   │   ├── call.model.ts     # Call/session models
│   │       │   │   ├── transcript.model.ts
│   │       │   │   ├── voice-analysis.model.ts
│   │       │   │   └── coach-conversation-state.model.ts
│   │       │   └── degreed-coach.routes.ts  # Route config with guards
│   │       │
│   │       ├── maestro-studio/           # Experience Builder (admin)
│   │       │   ├── components/           # 40+ builder components
│   │       │   │   ├── coach-builder-*   # Coach editor components
│   │       │   │   ├── quiz-builder-*    # Quiz editor components
│   │       │   │   └── roleplay-builder-* # Roleplay editor components
│   │       │   ├── coach-reactive-store/
│   │       │   │   └── coach-builder-facade.ts  # Signal-based form state
│   │       │   │       Extends BaseFormFacade<CoachFormValues, CoachBuilderState>
│   │       │   │       State: coachId, knowledgeBaseId, selectedCoach, coachSubType,
│   │       │   │              tableState, validationErrors, originalFormValue, editMode
│   │       │   ├── services/
│   │       │   │   ├── coach-file-upload.service.ts
│   │       │   │   ├── coach-image-upload.service.ts
│   │       │   │   ├── coach-knowledge-upload.service.ts
│   │       │   │   ├── coach-user-search.service.ts
│   │       │   │   ├── page-loader.service.ts
│   │       │   │   ├── builder-ui.service.ts
│   │       │   │   └── component-registry.service.ts
│   │       │   ├── strategies/           # Strategy pattern implementations
│   │       │   ├── models/               # Builder type definitions
│   │       │   └── maestro-studio.routes.ts  # /orgs/<orgId>/maestro-studio/*
│   │       │
│   │       ├── maestro-quiz/             # Quiz experience
│   │       │   ├── services/quiz.service.ts  # Quiz API (root singleton)
│   │       │   │   GET_QUIZ, CRUD, CRUD_ATTEMPTS, NEXT_QUESTION, SUBMIT_ANSWER
│   │       │   │   QUIZ_PERFORMANCE, QUESTION_PERFORMANCE, QUIZ_INSIGHTS, VALIDATE
│   │       │   └── components/           # Quiz UI components
│   │       │
│   │       └── maestro-roleplay/         # Roleplay experience
│   │           ├── services/roleplay-api.service.ts  # Roleplay API
│   │           │   getRoleplayForLearner, startConversation, getConversation,
│   │           │   getAllConversations, hasConversations, updateConversation,
│   │           │   getRoleplayFeedback
│   │           └── components/           # Roleplay UI components
│   │
│   └── lxp-docs/                         # Documentation app
│
├── libs/
│   ├── lxp/
│   │   ├── features/
│   │   │   ├── authorization/            # Auth interceptors & services
│   │   │   │   └── interceptors/auth.interceptor.ts  # 401 → logout redirect
│   │   │   ├── content/                  # Content management
│   │   │   ├── maestro/                  # Maestro core features
│   │   │   ├── maestro-studio/           # Experience Builder lib
│   │   │   ├── pathways/                 # Learning pathways
│   │   │   ├── skills/                   # Skills management
│   │   │   │   ├── services/             # Skill API & domain services
│   │   │   │   └── ui/                   # skill-expansion-panel, ratings-banner, progress-ring
│   │   │   ├── org/                      # Organization features
│   │   │   ├── profile/                  # User profile
│   │   │   ├── reporting/                # Analytics
│   │   │   ├── insights/                 # User insights
│   │   │   ├── learner-hub/              # Learner hub
│   │   │   ├── groups/                   # Group management
│   │   │   └── opportunities/            # Learning opportunities
│   │   ├── services/                     # 30+ shared services
│   │   │   ├── ngx-http-client.ts        # Custom HTTP wrapper
│   │   │   │   Auto /api prefix, camelCase (dg-casing: 'camel'),
│   │   │   │   URI encoding, CachedHttpRequest caching
│   │   │   ├── configuration.service.ts  # App configuration
│   │   │   ├── ld-flags.service.ts       # LaunchDarkly feature flags
│   │   │   │   └── ld-flags/skill-coach-ldflags.ts  # Maestro-specific flags
│   │   │   ├── locale.service.ts         # i18n locale
│   │   │   ├── translate.service.ts      # Translation helpers
│   │   │   ├── notifier.service.ts       # Toast notifications
│   │   │   ├── user-preferences.service.ts
│   │   │   ├── branding-api.service.ts   # Org branding
│   │   │   └── interceptors/
│   │   │       ├── xsrf-token.interceptor.ts   # CSRF protection
│   │   │       ├── caching.interceptor.ts       # GET request caching
│   │   │       └── mini-profiler.interceptor.ts # Dev perf monitoring
│   │   └── ui/                           # Shared UI components
│   │
│   └── shared/
│       ├── apollo/                       # Apollo design system (@degreed/apollo-tailwind)
│       ├── fresco/                       # Component library (Storybook, SVG icons, spinners)
│       ├── core/                         # Core utilities, user state, models
│       └── tinymce/                      # Rich text editor integration
```

## Routing Architecture
File: `apps/lxp/src/app/degreed-coach/degreed-coach.routes.ts`

```
/maestro                                    # Home (MaestroGuard)
/maestro/chat                               # DGA chat
/maestro/experiences                        # Explore coaches (CoachGuard)
/maestro/experiences/:coachId               # Individual coach
/maestro/experiences/:coachId/conversation/:conversationId  # Active conversation
/maestro/quiz/:quizId                       # Quiz (MaestroQuizGuard)
/maestro/roleplay/:roleplayId              # Roleplay (MaestroRoleplayGuard)
/maestro/access-denied                      # Consent error
/maestro/forbidden                          # Permission error
/maestro/not-found                          # 404

Maestro Studio: /orgs/<orgId>/maestro-studio/*
```
All routes lazy-loaded via `loadComponent()`. Guards check feature flags + permissions.

## Coach API Service — Complete Endpoint Map
File: `apps/lxp/src/app/degreed-coach/shared/constants.ts`

```typescript
COACH_API = {
  // Coaches
  GET_COACH, GET_COACH_FOR_ADMIN, COACH_LIST, CLONE_COACH, CREATE, UPDATE, DELETE,
  // Conversations
  CREATE_CONVERSATION, GET_CONVERSATIONS, GET_CONVERSATION_BY_ID,
  UPDATE_CONVERSATION, UPDATE_PARTIAL, DELETE_CONVERSATION,
  // Chat
  COACH_CHAT, COACH_CHAT_CONNECT, PREVIEW_CHAT, GENERATOR_CHAT, GENERATOR_CONNECT,
  // Feedback & Analysis
  FEEDBACK, USER_FEEDBACK, GET_FEEDBACK_OPTIONS, RECOMMENDATION, SKILL_REPORT,
  // Summaries
  SUMMARIES,
  // File Management
  UPLOAD_FILES, UPLOAD_STATUS, DGA_POLLING_STATUS, DELETE_FILES, REMOVE_RESOURCE,
  // Experience Builder
  EXPERIENCE_LIST, EXPERIENCE_DETAIL, RULE_GENERATOR, CREATE_DRAFT,
  GENERATE_COACH, GENERATE_QUIZ, GENERATE_AVATAR, DELETE_AVATAR,
  VALIDATE_COACH, DISCARD_CHANGES,
  // Permissions
  COACH_USERS, QUIZ_USERS, ROLEPLAY_USERS,
  DELETE_COACH_USER, DELETE_QUIZ_USER, DELETE_ROLEPLAY_USER,
  // Misc
  COACH_PREVIEW_REGISTERCALL, ROLEPLAY_REGISTERCALL,
  GET_COACH_RESOURCES, CONVERSATION_STARTERS, FILTER_VALUES, MAESTRO_LIST,
  DELETE_FEEDBACK_RUBRIC,
}
```

## State Management Patterns
1. **Angular Signals** (Angular 18+): Signal-based reactive state with computed view models
2. **Facade Pattern**: Business logic orchestration between services and state
3. **RxJS**: Observables for HTTP, SSE streams, polling, side effects
4. **NgxHttpClient**: Custom HTTP wrapper with auto `/api` prefix, camelCase conversion, caching

### Key Facades
- **CoachConversationFacade**: Orchestrates chat, voice, polling, panels. Computed: messages, inProgress, audioMode, conversationId, activeCoach, voiceModeEnabled
- **CoachBuilderFacade**: Extends BaseFormFacade for experience builder forms. Signal state + FormBuilder validation

## DGA (Degreed Assistant) Service
File: `degreed-assistant/services/degreed.assistant.service.ts`
- `sendQuery(query, correlation_id)`: POST to `/assistant/connect`
- `listenToSSE(observer)`: EventSource to `/api/assistant/chat?session_id={id}`
- UUID-based session tracking
- Models: `DGAssistantChatMessage { isAI, id, datetime, message, suggestions }`

## HTTP Interceptors (Ordered)
1. **AuthInterceptor**: 401 → logout redirect (skips `Dg-Skip-Intercept` header)
2. **XSRFTokenInterceptor**: CSRF token handling
3. **CachingInterceptor**: GET request caching via `CachedHttpRequest`
4. **MiniProfilerInterceptor**: Dev performance monitoring
5. **MSTeamsAuthInterceptor**: MS Teams integration auth

## Build Commands
```bash
npm run build:lxp              # Production build
npm run build:lxp:staging      # Staging build
npm run start:lxp              # Dev server with HMR
npm run test:lxp               # Tests
npm run lint:lxp               # Linting
npm run build:fresco           # Component library
```
