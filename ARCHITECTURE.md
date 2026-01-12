# Architecture and Data Flow Documentation

This document provides an overview of the architecture and data flow for the Stanford AI Playground file processing features.

## System Architecture

The Stanford AI Playground is built on LibreChat and consists of:

1. **Frontend (React)**: User interface for file uploads and chat
2. **Backend API (Node.js/Express)**: File processing and AI integration
3. **Docker Containers**: API server, MongoDB database
4. **External APIs**: OpenAI Whisper API for transcription, AI providers for chat

## Architecture Diagram

```
┌─────────────┐
│   Browser   │
│  (React UI) │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────────────┐
│   Express Backend   │
│  ┌───────────────┐  │
│  │ File Upload   │  │
│  │ /api/files    │  │
│  └───────┬───────┘  │
│  ┌───────▼───────┐  │
│  │ File Processor│  │
│  │ - Audio/Video │  │
│  │ - Documents   │  │
│  └───────┬───────┘  │
│  ┌───────▼───────┐  │
│  │ STT Service   │  │
│  │ (Whisper API) │  │
│  └───────┬───────┘  │
│  ┌───────▼───────┐  │
│  │ AI Client     │  │
│  │ (GPT/Claude)  │  │
│  └───────────────┘  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  External Services  │
│  - OpenAI Whisper   │
│  - AI Providers     │
└─────────────────────┘
```

## Data Flow

### Video/Audio Processing Flow

**Option 1: Multimodal Providers (Google/Gemini, OpenRouter)**
```
1. User uploads video/audio file
   ↓
2. Backend receives file via /api/files
   ↓
3. System detects provider supports multimodal
   ↓
4. File stored and passed directly to LLM
   ↓
5. LLM processes video/audio directly
   ↓
6. Response includes full context (visual + audio)
```

**Option 2: Transcription (Non-Multimodal Providers)**
```
1. User uploads audio file (video not supported)
   ↓
2. Backend receives file via /api/files
   ↓
3. Send audio to OpenAI Whisper API
   ↓
4. Receive transcript text
   ↓
5. Store transcript as text file
   ↓
6. User can chat with transcript
```

### Document Chat Flow (Without RAG)

```
1. User uploads document (PDF/DOCX)
   ↓
2. Backend stores file
   ↓
3. User sends message with file
   ↓
4. Backend extracts text from document
   ↓
5. Text is added to chat context
   ↓
6. AI provider processes message + document text
   ↓
7. Response streamed back to user
```

## Key Components

### Frontend
- **`useFileHandling.ts`**: Handles file uploads
- **`ChatForm.tsx`**: Chat input with file attachment

### Backend
- **`files.js`**: File upload endpoint (`POST /api/files`)
- **`process.js`**: Main file processing logic (includes multimodal detection)
- **`extractAudio.js`**: Extracts audio from video files (uses ffmpeg, for STT fallback)
- **`STTService.js`**: Interfaces with OpenAI Whisper API (for non-multimodal providers)
- **`encode/audio.ts`** and **`encode/video.ts`**: Encode audio/video for multimodal providers
- **`request.js`**: Handles chat requests and streaming

## Data Storage

- **Files**: Stored in `/app/uploads/` (Docker container)
- **Database**: MongoDB stores file metadata and chat history
- **Temporary Files**: Extracted audio files are cleaned up after processing

## Configuration

### Environment Variables (`.env`)
- `OPENAI_API_KEY`: Required for Whisper transcription (with non-multimodal providers)
- `GOOGLE_KEY`: Required for Google/Gemini multimodal support (recommended for video/audio)
- `MONGO_URI`: MongoDB connection
- `JWT_SECRET`: Authentication secret

### Configuration File (`librechat.yaml`)
```yaml
speech:
  stt:
    openai:
      apiKey: ${OPENAI_API_KEY}
      model: whisper-1
      url: https://api.openai.com/v1/audio/transcriptions
```

## API Endpoints

- **POST** `/api/files`: Upload files (audio, video, documents)
- **POST** `/api/agents/chat`: Send chat message with file context
- **GET** `/api/agents/chat/status/:conversationId`: Get chat status

