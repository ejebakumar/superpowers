---
name: degreed-flutter-stack
description: Use when working in the Degreed Flutter/Dart mobile app (iOS + Android) — its BLoC/Cubit (DegreedCubit) state patterns, Dio HTTP, SSE streaming, LiveKit voice, or navigation for Coach, Assistant, Quiz, and Roleplay features.
---

# Degreed Flutter Mobile Stack Guide

## Overview
Flutter mobile application for iOS and Android. Provides native mobile experiences for Degreed's AI features: Coach conversations (text + voice), Degreed Assistant, Quiz, and Roleplay. Uses BLoC/Cubit pattern for state management and Dio for HTTP communication.

## Tech Stack
- **Framework**: Flutter 3.35.4+ / Dart >=3.0.0 <4.0.0
- **State Management**: Custom `DegreedCubit<State>` pattern (extends flutter_bloc Cubit with `safeEmit()`)
- **HTTP**: Dio 5.x client with interceptors (auth, cache, GCP logging, SSL pinning, connectivity)
- **Real-time**: LiveKit Flutter SDK 2.x (voice/video), SSE via `flutter_client_sse` package
- **Navigation**: auto_route 10.x (annotation-based declarative routing)
- **DI**: GetIt 9.x (service locator via `core/service_locator.dart`)
- **Storage**: SharedPreferences, Hive (local cache)
- **Code Generation**: Freezed 3.x (immutable state classes), json_serializable

## Project Structure
```
degreed-flutter/
├── lib/
│   ├── main.local.dart                  # Local dev entry point
│   ├── main.staging.dart                # Staging entry point
│   ├── main.beta.dart                   # Beta entry point
│   ├── main.release.dart                # Release entry point
│   ├── main.production.dart             # Production entry point
│   ├── main.china.dart                  # China region entry point
│   │
│   ├── app/
│   │   └── navigation/                  # auto_route route definitions
│   │
│   ├── coach_chat/                      # Coach text chat experience
│   │   ├── bloc/                        # Coach chat cubits/state
│   │   └── ui/                          # Coach chat UI widgets
│   │
│   ├── degreed_assistant/               # Degreed Assistant (DGA)
│   │   ├── bloc/                        # Chat cubit (SSE streaming)
│   │   ├── dga_util/                    # DGA utilities
│   │   └── ui/                          # DGA chat UI
│   │
│   ├── quiz/                            # Quiz experience
│   │   ├── cubit/                       # Quiz cubit/state
│   │   ├── models/                      # Quiz data models
│   │   ├── screens/                     # Quiz screens
│   │   ├── service/                     # Quiz API service
│   │   ├── localization/                # Quiz i18n
│   │   └── widgets/                     # Quiz UI components
│   │
│   ├── mobile_coach/                    # Voice coach + roleplay
│   │   ├── bloc/                        # LiveKit cubit, conversation cubit
│   │   ├── services/                    # Voice services
│   │   └── ui/                          # Voice UI components
│   │
│   ├── skills/                          # Skills management
│   │   ├── cubit/                       # Skills cubit
│   │   └── ui/                          # Skills UI
│   │
│   ├── login/                           # Authentication
│   │   ├── dev_login/                   # Dev login flow
│   │   ├── forgot_password/             # Password recovery
│   │   ├── reset_password/              # Password reset
│   │   └── reset_password_from_link/    # Deep-link reset
│   │
│   ├── maestro_consent/                 # Maestro consent flows
│   ├── maestro_conversation/            # Conversation management
│   ├── maestro_recommendation/          # AI recommendations
│   ├── maestro_share/                   # Share experiences
│   ├── pathways/                        # Learning pathways
│   ├── browse/                          # Content browsing
│   ├── search/                          # Search
│   ├── profile_new/                     # User profile
│   ├── dashboard/                       # Home dashboard
│   ├── groups/                          # Groups
│   ├── notifications/                   # Push notifications
│   ├── opportunities/                   # Learning opportunities
│   ├── plans/                           # Learning plans
│   ├── tasks/                           # Tasks
│   │
│   └── core/
│       ├── service_locator.dart         # GetIt DI registration (~19KB)
│       ├── network/                     # Networking layer
│       │   ├── network_config.dart      # Dio client configuration
│       │   ├── auth_interceptor.dart    # Auth token injection
│       │   ├── cache_control_interceptor.dart  # HTTP caching
│       │   ├── gcp_logging_interceptor.dart    # GCP logging
│       │   ├── connectivity_checker.dart       # Network connectivity
│       │   ├── ssl_pinning.dart         # SSL pinning
│       │   └── network_cache_cipher.dart # Cache encryption
│       ├── services/                    # 23+ shared services (auth, SSE, etc.)
│       │   └── sse_service.dart         # SSE client (flutter_client_sse)
│       ├── models/                      # 224+ shared data models
│       ├── navigation/                  # Route definitions
│       ├── theme/                       # App theming
│       ├── utils/                       # 33+ utility modules
│       ├── widgets/                     # 56+ reusable widgets
│       ├── bloc/                        # Base DegreedCubit class
│       ├── cubits/                      # Global cubits
│       ├── repos/                       # Repository implementations
│       └── enums/                       # Shared enums
│
├── test/                                # Unit & widget tests
├── integration_test/                    # Integration tests
├── android/                             # Android native config
├── ios/                                 # iOS native config
├── pubspec.yaml                         # Dependencies
└── analysis_options.yaml                # Lint rules
```

## Architecture Pattern (Flat Module + Cubit)
```
Feature Modules (lib/coach_chat/, lib/quiz/, etc.)
  ├── bloc/cubit/     → DegreedCubit<State> + state classes
  ├── ui/screens/     → Flutter widgets & pages
  ├── models/         → Data models (Freezed-generated)
  └── service/        → API services
       ↓
Core (lib/core/)
  ├── service_locator.dart  → GetIt DI registration
  ├── services/             → Shared services (auth, SSE, etc.)
  ├── repos/                → Repository implementations
  ├── models/               → 224+ shared models
  └── network/              → Dio client + interceptors
```

**Note:** This project does NOT use Clean Architecture layers (domain/data/presentation). Features are flat modules at `lib/` root level with bloc + ui subdirectories.

## Key Cubit Patterns

All cubits extend a custom `DegreedCubit<State>` base class (NOT standard `Cubit`). Key differences from vanilla flutter_bloc:
- Uses `safeEmit()` instead of `emit()` for safe state emission
- States use `copyWith()` for immutability (Freezed-generated)
- No separate Event classes — pure Cubit pattern (methods, not events)

### Coach Chat
```dart
// Coach text chat experience in lib/coach_chat/bloc/
class CoachChatCubit extends DegreedCubit<CoachChatState> {
  // Manages SSE streaming, message list, conversation state
  // Uses SSE service for real-time AI responses
}
```

### DGA (Degreed Assistant)
```dart
// DGA chat in lib/degreed_assistant/bloc/
class ChatCubit extends DegreedCubit<ChatState> {
  // Manages SSE stream, session_id, scope, suggestions
  // Uses flutter_client_sse for streaming
}
```

### Mobile Coach (Voice)
```dart
// Voice sessions in lib/mobile_coach/bloc/
class LiveKitCubit extends DegreedCubit<LiveKitState> {
  // Manages LiveKit WebRTC voice sessions
  // Handles room connection, audio state, transcripts
}
class ConversationCubit extends DegreedCubit<ConversationState> {
  // Manages conversation lifecycle during voice calls
}
```

## Mobile API Communication
- **Base URL**: Same .NET backend as web (mobile endpoints at `/api/mobile/v2/...`)
- **Auth**: Bearer token (stored securely) injected via `auth_interceptor.dart`
- **SSE**: `flutter_client_sse` package via `core/services/sse_service.dart` for real-time AI responses
- **Voice**: LiveKit Flutter SDK (`livekit_client` ^2.5.3) for WebRTC voice sessions
- **Polling**: Timer-based polling for conversation updates (summaries, inferences)
- **Caching**: `cache_control_interceptor.dart` with encrypted cache via `network_cache_cipher.dart`
- **SSL**: Certificate pinning via `ssl_pinning.dart`

## Mobile-Specific Endpoints
The .NET backend provides mobile-optimized variants:
```
/api/mobile/v2/coach/*           # Mobile coach endpoints
/api/mobile/v2/assistant/*       # Mobile assistant endpoints
/api/mobile/v2/quiz/*            # Mobile quiz endpoints
```

## Voice (LiveKit) Integration
```dart
// Voice call flow (managed by LiveKitCubit in lib/mobile_coach/bloc/):
// 1. POST /api/coach/RegisterCall → { callId, accessToken, socketUrl }
// 2. Connect to LiveKit room with accessToken
// 3. Audio frames streamed via WebRTC
// 4. Transcripts received as data messages
// 5. On disconnect → post-processing triggers
```

## Dependency Injection (GetIt)
All DI registration is centralized in `lib/core/service_locator.dart` (~19KB). Uses GetIt 9.x:
```dart
// Services, repositories, cubits all registered in service_locator.dart
getIt.registerLazySingleton<NetworkConfig>(() => NetworkConfig());
getIt.registerFactory<CoachChatCubit>(() => CoachChatCubit(getIt(), getIt()));
```

## Multi-Flavor Entry Points
The app uses flavor-based entry points for different environments:
```
lib/main.local.dart       # Local development
lib/main.staging.dart     # Staging
lib/main.beta.dart        # Beta (EU/US)
lib/main.release.dart     # Release
lib/main.production.dart  # Production (EU/US/CA/USSE02)
lib/main.china.dart       # China region
```

## Key Dependencies (pubspec.yaml)
```yaml
flutter_bloc: ^9.1.1      # Cubit state management (custom DegreedCubit base)
dio: ^5.9.0               # HTTP client
auto_route: ^10.2.0       # Annotation-based declarative routing
get_it: ^9.0.5            # Service locator DI
livekit_client: ^2.5.3    # LiveKit WebRTC
shared_preferences: ^2.2.2 # Key-value storage
hive: ^2.2.3              # Local database
json_annotation: ^4.9.0   # JSON serialization
equatable: ^2.0.8         # Value equality for states
freezed_annotation: ^3.1.0 # Immutable state class generation
flutter_client_sse: ^2.0.3 # SSE streaming client
```
