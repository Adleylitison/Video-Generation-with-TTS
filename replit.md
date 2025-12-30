# AI Video Studio

An AI-powered video generation platform that creates emotive or informative vertical videos from scripts using multiple AI services.

## Overview

AI Video Studio combines TTS (Pipecat), background video generation (Sora 2), music generation (Gemini with Lyra), and FFmpeg video composition to create professional vertical videos (1080x1920) optimized for mobile viewing.

## Features

### Current Implementation (MVP)
- **User Authentication**: Complete auth system using Replit Auth (OpenID Connect)
  - Supports Google, GitHub, X, Apple, email/password login
  - Secure session management with PostgreSQL storage
  - User profile display with avatar and logout
  - Session expiry detection with automatic redirect to login
  - Landing page for new visitors
- **Script Editor**: Full-featured text editor with word/character count
- **Video Type Selection**: Choose between emotive/story or informative modes
  - Emotive: Synchronized music and visuals for enhanced emotional feedback
  - Informative: Literal content display with simple background music
- **API Key Management**: Secure storage and configuration for Sora 2, Gemini, and Pipecat APIs
- **Processing Status**: Real-time multi-stage progress indicator showing:
  1. Script Analysis
  2. TTS Audio Generation
  3. Music Creation
  4. Background Video Generation
  5. Final Video Composition
- **Video Preview**: 9:16 aspect ratio preview with playback controls
- **Download Functionality**: Export generated videos
- **Dark/Light Mode**: Full theme support with persistent preference

## Project Structure

### Frontend (`client/src/`)
- `pages/landing.tsx` - Landing page for unauthenticated users
- `pages/home.tsx` - Main video creation interface (authenticated) with project management
- `hooks/useAuth.ts` - Authentication state hook with 401 handling
- `components/project-list.tsx` - Project history sidebar with selection and deletion
- `components/script-editor.tsx` - Script input with metrics
- `components/video-type-selector.tsx` - Mode selection UI
- `components/api-key-manager.tsx` - API key configuration
- `components/processing-status.tsx` - Real-time progress display
- `components/video-preview.tsx` - Video playback component
- `components/theme-toggle.tsx` - Dark/light mode switcher

### Backend (`server/`)
- `replitAuth.ts` - Replit Auth integration with OpenID Connect and session management
- `routes.ts` - Complete API endpoints for video generation, status polling, streaming, downloads, and auth
- `storage.ts` - PostgreSQL database persistence with Drizzle ORM (users, sessions, projects)
- `db.ts` - Database connection configuration
- `services/videoProcessor.ts` - Complete video processing pipeline with job queue management and duration policy
- `services/ttsService.ts` - IndexTTS-2 integration for text-to-speech generation
- `services/soraApi.ts` - Sora 2 API integration for video generation
- `services/googleDrive.ts` - Google Drive integration for video storage
- `services/durationPolicy.ts` - Smart duration snapping for Sora 10s/15s constraints
- `services/audioUtils.ts` - Audio padding and duration measurement utilities
- `services/videoUtils.ts` - Video extension with freeze-frame technique
- `services/subtitleUtils.ts` - Timed ASS subtitle generation with word-count-based timing

### Shared (`shared/`)
- `schema.ts` - TypeScript interfaces and Zod validation schemas (users, sessions, projects)

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, TanStack Query
- **Backend**: Express.js, Node.js, PostgreSQL, Drizzle ORM
- **Video Processing**: FFmpeg (fluent-ffmpeg) with job queue management
- **AI Services**:
  - IndexTTS-2 (Hugging Face) for text-to-speech with voice cloning
  - Sora 2 for background video generation
  - Gemini API with Lyra for music generation (placeholder)

## Design System

- Primary color: Purple/blue (#7C61FF - hsl(250, 85%, 65%))
- Dark mode preferred
- Typography: Inter (interface), JetBrains Mono (code/script)
- Vertical video format: 1080x1920 (9:16 aspect ratio)

## User Preferences

- Video output format: MP4, vertical (1080x1920)
- API keys stored in localStorage
- Theme preference persisted across sessions

## Recent Changes

- 2025-12-04: Timed Synchronized Subtitles
  - Created subtitleUtils.ts for generating ASS format timed subtitles
  - Subtitles split into segments based on sentence/clause breaks (periods, commas, etc.)
  - Word-count-based timing distributes duration proportionally across segments
  - Normalization ensures total segment time fits within audio duration (no overflow)
  - Mobile-optimized styling: yellow text, bottom-center, proper word wrapping
  - FFmpeg integration via ass filter replaces static text overlay
  - Graceful fallback to static subtitles if script is empty
  - Subtitle files cleaned up after video composition

- 2025-11-19: Duration Policy System (Sora Constraint Handling)
  - Implemented smart duration policy to handle Sora API's fixed 10s/15s duration constraint
  - Created duration snapping logic: audio ≤10s → 10s video, audio >10s → 15s video
  - Added audio padding with silence to match target Sora duration (never truncates speech)
  - Implemented video freeze-frame extension to match padded audio length
  - Fixed critical bug where 10.1-10.5s audio would cause speech truncation
  - New utility modules: durationPolicy.ts, audioUtils.ts, videoUtils.ts
  - Videos now perfectly sync with narration length while respecting Sora constraints
  - Warns users if script approaches or exceeds 15s limit

- 2025-11-19: TTS Integration with IndexTTS-2
  - Integrated IndexTTS-2 Hugging Face Space API for text-to-speech generation
  - Created server-side TTS service using @gradio/client with voice cloning support
  - Added default voice/emotion reference audio files (WAV format)
  - Implemented graceful fallback to silent audio if TTS API fails
  - Fixed format consistency: all narration audio now uses WAV (pcm_s16le) format
  - Added comprehensive validation and error handling for TTS responses
  - Fixed missing ApiKeyManager import in home.tsx

- 2025-11-02: User Project Management (Task 2 Complete)
  - Built ProjectList component with toggle-elevate selection and complete data-testid coverage
  - Implemented project loading: loads title, script, videoType into editor; shows preview for complete projects
  - Added confirmation dialog (AlertDialog) for project deletion with proper state cleanup
  - Integrated responsive 1/2/2 layout (sidebar/editor/preview) with toggle visibility
  - Project creation and deletion auto-refresh sidebar via React Query cache invalidation
  - Fixed isProcessing state management: editor unlocks when loading non-processing projects
  - "New Project" button clears editor; "My Projects" button toggles sidebar
  - Empty state and loading skeleton for project list

- 2025-11-02: User Authentication System (Task 1 Complete)
  - Implemented Replit Auth with OpenID Connect for multi-provider login
  - Added users and sessions tables with proper foreign key relationships
  - Protected all project routes with authentication middleware and ownership verification
  - Built landing page for unauthenticated users with login flow
  - Updated Home page with user profile, avatar, and logout button
  - Fixed session expiry handling with proper 401 detection and auto-redirect
  - useAuth hook uses getQueryFn({ on401: "returnNull" }) for reliable state management
  - Session cookies configured with secure flag for production only
  - Auth state transition tracking with toast notifications on session expiry

- 2025-10-21: Complete MVP implementation
  - Full frontend UI with exceptional visual quality
  - Complete backend with FFmpeg integration
  - PostgreSQL database persistence
  - Job queue management (FIFO, max 1 concurrent job)
  - Separate endpoints for video streaming (preview) and downloads
  - Real-time processing status with polling
  - End-to-end tested and verified working
  - SEO optimization with page title and meta description

## Implementation Status

✅ **Complete and Tested**
- Frontend: All components with polished UI/UX
- Backend: Complete API with video processing pipeline
- Database: PostgreSQL with Drizzle ORM
- Video Pipeline: FFmpeg composition with placeholder AI services
- Testing: End-to-end workflow verified

⏳ **Awaiting API Keys**
- Sora 2 API integration (active)
- Gemini API integration (placeholder ready)

✅ **TTS Integration Complete**
- IndexTTS-2 via Hugging Face Space (@gradio/client)
- Server-side service with graceful fallback to silent audio
- Default reference audio files (sine waves - replace with real voice samples for production)
- WAV format throughout the pipeline for compatibility

## API Endpoints

### Authentication
- `GET /api/login` - Initiate Replit Auth login flow
- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/auth/user` - Get current authenticated user
- `GET /api/logout` - Logout and clear session

### Projects (All Protected - Require Authentication)
- `POST /api/projects` - Create new video project
- `GET /api/projects` - List user's projects
- `GET /api/projects/:id` - Get project details (ownership verified)
- `POST /api/projects/:id/generate` - Start video generation (ownership verified)
- `GET /api/projects/:id/status` - Get processing status (ownership verified)
- `GET /api/projects/:id/video` - Stream video for preview (ownership verified)
- `GET /api/projects/:id/download` - Download video file (ownership verified)
- `DELETE /api/projects/:id` - Delete project and files (ownership verified)

## Video Processing Pipeline

1. **Analyzing** (10%) - Extract themes and emotional beats
2. **TTS Generation** (30%) - Create voiceover (Pipecat placeholder)
3. **Music Generation** (50%) - Compose background music (Gemini placeholder)
4. **Video Generation** (70%) - Generate background video (Sora placeholder)
5. **Composition** (90%) - FFmpeg merges all assets with subtitles
6. **Complete** (100%) - Video ready for preview/download

## Next Steps

1. User to provide API keys for Sora 2, Gemini, and Pipecat
2. Replace placeholder AI service calls with real API integrations
3. Fine-tune video generation parameters
4. Consider deploying/publishing the application
