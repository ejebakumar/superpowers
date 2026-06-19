# Project: Maestro Multi-Repository Workspace

**Last Updated:** 2026-02-17

## Overview

Multi-root VS Code workspace with four separate Degreed repositories cloned into the same folder. These repositories work together to power the Maestro AI coaching platform.

**Note:** This is NOT a monorepo - each directory is an independent Git repository. The workspace configuration (`maestro.code-workspace`) provides unified IDE access.

## Repository Structure

| Repository | Technology | Purpose |
|------------|------------|---------|
| **Degreed/** | .NET 8, SQL Server | Backend monolith - LXP, APIs, WebJobs, Foundation services |
| **fe-workspace/** | Angular 19, React 18, Nx | Frontend monorepo - LXP UI, Skills Platform, Visualizer |
| **degreed-coach-builder/** | Python 3.12, FastAPI | AI coaching backend - GPT-4o, LiveKit, RAG |
| **degreed-flutter/** | Flutter/Dart, Bloc | Mobile app - iOS/Android Maestro experience |

## Key Commands

### fe-workspace (Frontend)
```bash
cd fe-workspace
npm run start:lxp              # Start LXP application
npm run start:visualizer       # Start Visualizer
nx affected -t test            # Test affected projects
nx affected -t build           # Build affected
npm run test-all               # All quality checks
```

### degreed-coach-builder (AI Service)
```bash
cd degreed-coach-builder
make install                   # Create venv and install dependencies
make run                       # Run FastAPI server (localhost:8000)
make test                      # Run pytest
source venv/bin/activate       # Activate virtual environment
```

### Degreed (Backend .NET)
```bash
cd Degreed/trunk
./dg.ps1 build                 # Build solution
./dg.ps1 t                     # Run unit tests
./dg.ps1 web                   # Start web application
./dg.ps1 ops                   # Start operations web

# Database
cd Degreed
make docker-up                 # Start SQL Server + Redis
make docker-down               # Stop Docker services
make db-setup                  # Setup database
```

### degreed-flutter (Mobile)
```bash
cd degreed-flutter
flutter pub get                # Install dependencies
flutter run                    # Run on connected device/emulator
flutter test                   # Run unit tests
flutter build apk              # Build Android APK
flutter build ios              # Build iOS app
```

## Architecture

**Data Flow:**
```
Mobile/Web → .NET API → Python AI Service → Azure OpenAI + LiveKit
                ↓              ↓
          SQL Server        Redis
```

**Key Features:**
- **Coach** - AI coaching conversations with personalization
- **Quiz** - AI-generated assessments with multi-agent question generation
- **Roleplay** - Scenario-based learning within coach conversations
- **Voice** - Real-time voice calls with LiveKit WebRTC
- **Maestro Studio** - Admin interface for creating/managing coaches and quizzes

## Technology Stack

### Frontend (fe-workspace)
- **Framework:** Angular 19, React 18
- **Monorepo:** Nx workspace
- **Package Manager:** npm
- **Node Version:** 20.19.5

### Backend (Degreed)
- **Framework:** .NET 8 (mixed with some .NET Framework 4.7.2)
- **Database:** SQL Server with Entity Framework
- **Caching:** Redis
- **Build:** PowerShell-based (dg.ps1)

### AI Service (degreed-coach-builder)
- **Framework:** FastAPI (Python 3.12)
- **AI:** Azure OpenAI (GPT-4o), Realtime API
- **Vector Store:** Azure Managed Redis
- **Voice:** LiveKit WebRTC
- **Package Manager:** pip + venv

### Mobile (degreed-flutter)
- **Framework:** Flutter/Dart
- **State Management:** Bloc/Cubit with Freezed
- **HTTP Client:** Dio
- **Voice:** LiveKit WebRTC

## Development Setup

1. **Prerequisites:**
   - Node.js 20.19.5+
   - .NET 8 SDK
   - Python 3.12+
   - Flutter 3.35.4+
   - Docker Desktop
   - PowerShell Core 7.0+

2. **Quick Start:**
   ```bash
   # Start Docker services
   cd Degreed && make docker-up

   # Start .NET backend
   cd Degreed/trunk && ./dg.ps1 web

   # Start Python AI service
   cd degreed-coach-builder && make run

   # Start frontend
   cd fe-workspace && npm run start:lxp
   ```

## Additional Context

- **CLAUDE.md** files exist in root, fe-workspace/, and Degreed/ with detailed architecture
- **7 custom skills** provide feature-specific guidance (coach, quiz, voice, etc.)
- **Database schema:** `aicoach.*` tables for Maestro features
- **API Base Path:** Python service uses `/dgcb` prefix
