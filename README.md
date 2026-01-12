# Stanford AI Playground

A comprehensive AI chat platform with advanced file processing capabilities including video transcription, audio transcription, and document chat without RAG.

## Features

### 🎥 Video Transcription
- Upload video files (MP4, MOV, WebM, etc.)
- Automatic audio extraction using ffmpeg
- Speech-to-text transcription using OpenAI Whisper API
- Support for videos with audio tracks

### 🎵 Audio Transcription
- Direct audio file upload (WAV, MP3, M4A, etc.)
- Real-time transcription using OpenAI Whisper API
- Multiple audio format support

### 📄 Document Chat (Without RAG)
- Upload documents (PDF, DOCX, TXT, etc.)
- Direct file attachment to chat context
- Ask questions and get answers based on document content
- No indexing or RAG required - files are processed on-demand

## Prerequisites

- **Docker** and **Docker Compose** installed
- **Node.js** 18+ (for local development)
- **MongoDB** (included in Docker setup)
- **OpenAI API Key** (for Whisper transcription)
- **AI Provider API Key** (OpenAI, Anthropic, Google, etc.)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Stanford_Assessment-
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set the following required variables:

```env
# OpenAI API Key (required for transcription)
OPENAI_API_KEY=your_openai_api_key_here

# MongoDB Connection
MONGO_URI=mongodb://127.0.0.1:27017/LibreChat

# Server Configuration
HOST=localhost
PORT=3080

# JWT Secret (generate a random string)
JWT_SECRET=your_jwt_secret_here

# Optional: Other AI Provider Keys
ANTHROPIC_API_KEY=your_anthropic_key_here
GOOGLE_API_KEY=your_google_key_here
```

### 3. Configure LibreChat

The `librechat.yaml` file is already configured with STT settings. Ensure it includes:

```yaml
speech:
  stt:
    openai:
      apiKey: ${OPENAI_API_KEY}
      model: whisper-1
      url: https://api.openai.com/v1/audio/transcriptions
```

### 4. Start the Application

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:3080
```

## Setup Instructions

### Initial Setup

1. **Install Dependencies** (if running locally):
   ```bash
   npm install
   ```

2. **Build Frontend** (if needed):
   ```bash
   cd client
   npm install
   npm run build
   cd ..
   ```

3. **Start MongoDB** (if not using Docker):
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

4. **Start the Application**:
   ```bash
   docker-compose up -d
   ```

### Docker Services

The application consists of the following Docker services:

- **api**: Backend API server (Node.js/Express)
- **mongodb**: MongoDB database
- **redis**: Redis cache (if configured)
- **meilisearch**: Search engine (if configured)

### Configuration Files

- **`.env`**: Environment variables (API keys, database URLs, etc.)
- **`librechat.yaml`**: LibreChat configuration (STT settings, UI customization)
- **`docker-compose.yml`**: Docker service definitions
- **`docker-compose.override.yml`**: Local overrides (volume mounts, ffmpeg installation)

## Demo Instructions

### Demo 1: Video File Transcription

1. **Upload a Video File**:
   - Click the attachment button in the chat input
   - Select a video file (MP4, MOV, etc.) with audio
   - Wait for upload to complete

2. **Verify Transcription**:
   - The system will automatically:
     - Detect the video file
     - Extract audio using ffmpeg
     - Transcribe using Whisper API
     - Store the transcript
   - You should see a message indicating the transcript is ready

3. **Ask Questions**:
   - Ask questions about the video content
   - The AI will use the transcript to answer

**Example**:
```
User: [Uploads video.mp4]
System: File uploaded and processed successfully
User: What is the main topic discussed in this video?
AI: [Answers based on transcript]
```

### Demo 2: Audio File Transcription

1. **Upload an Audio File**:
   - Click the attachment button
   - Select an audio file (WAV, MP3, M4A, etc.)
   - Wait for upload to complete

2. **Verify Transcription**:
   - The system will automatically transcribe the audio
   - Transcript is stored and available for chat

3. **Ask Questions**:
   - Ask questions about the audio content

**Example**:
```
User: [Uploads audio.wav]
System: File uploaded and processed successfully
User: Summarize the key points from this audio
AI: [Summarizes based on transcript]
```

### Demo 3: Document Chat (Without RAG)

1. **Upload a Document**:
   - Click the attachment button
   - Select a document (PDF, DOCX, TXT, etc.)
   - Wait for upload to complete

2. **Ask Questions**:
   - Ask questions about the document content
   - The AI will read the document and answer

**Example**:
```
User: [Uploads document.pdf]
System: File uploaded successfully
User: What are the main conclusions in this document?
AI: [Answers based on document content]
User: Can you provide more details on section 3?
AI: [Provides detailed answer from section 3]
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options. Key variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for Whisper transcription | Yes |
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret for JWT token signing | Yes |
| `HOST` | Server host | No (default: localhost) |
| `PORT` | Server port | No (default: 3080) |
| `ANTHROPIC_API_KEY` | Anthropic API key | Optional |
| `GOOGLE_API_KEY` | Google AI API key | Optional |

### LibreChat Configuration

Edit `librechat.yaml` to customize:

- **STT Settings**: Speech-to-text configuration
- **UI Customization**: Welcome messages, themes
- **Endpoint Configuration**: AI provider settings

## Architecture

For detailed architecture and data flow documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Limitations

For complete information on file size limits, supported formats, and model requirements, see [LIMITATIONS.md](./LIMITATIONS.md).

### Quick Reference

- **Audio/Video Files**: Max 25 MB (Whisper API limit)
- **Document Files**: Max 512 MB (OpenAI), 100 MB (Anthropic), 20 MB (Google)
- **Supported Formats**: See LIMITATIONS.md for complete list
- **Processing Time**: ~1-2 seconds per minute of audio/video

## Troubleshooting

### Video Transcription Not Working

1. **Check ffmpeg Installation**:
   ```bash
   docker-compose exec api ffmpeg -version
   ```

2. **Verify Audio Stream**:
   - Ensure video file has an audio track
   - Check logs: `docker-compose logs api | grep extractAudio`

3. **Check STT Configuration**:
   - Verify `OPENAI_API_KEY` is set in `.env`
   - Check `librechat.yaml` has STT configuration

### Audio Transcription Not Working

1. **Check API Key**:
   ```bash
   docker-compose exec api env | grep OPENAI_API_KEY
   ```

2. **Check File Format**:
   - Ensure file is in supported format (WAV, MP3, M4A, etc.)
   - Check file size is under 25 MB

3. **Check Logs**:
   ```bash
   docker-compose logs api | grep STT
   ```

### Document Chat Not Working

1. **Check File Format**:
   - Ensure document is in supported format (PDF, DOCX, TXT, etc.)

2. **Check File Size**:
   - Verify file is under size limit for your AI provider

3. **Check AI Provider**:
   - Ensure API key is configured for your chosen provider

### General Issues

1. **Container Not Starting**:
   ```bash
   docker-compose down
   docker-compose up -d
   docker-compose logs -f
   ```

2. **Port Already in Use**:
   - Change `PORT` in `.env` to a different port
   - Update `docker-compose.yml` if needed

3. **MongoDB Connection Issues**:
   - Verify MongoDB is running: `docker-compose ps`
   - Check `MONGO_URI` in `.env`

## Development

### Running Locally (Without Docker)

1. **Install Dependencies**:
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

2. **Start MongoDB**:
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

3. **Start Backend**:
   ```bash
   npm run dev:api
   ```

4. **Start Frontend**:
   ```bash
   npm run dev:client
   ```

### Hot Reload

The `docker-compose.override.yml` file includes volume mounts for hot-reload during development:

- `api/server/routes/files/files.js`
- `api/server/services/Files/process.js`
- `api/server/services/Files/Audio/extractAudio.js`
- `api/server/services/Files/Audio/STTService.js`

Changes to these files will be reflected immediately without rebuilding.

### Testing

```bash
# Run tests (if available)
npm test

# Check logs
docker-compose logs -f api
```

## Security

- **API Keys**: Never commit API keys to version control
- **Environment Variables**: Use `.env` file (not committed)
- **File Validation**: All files are validated for type and size
- **Authentication**: JWT-based authentication required
- **File Access**: Users can only access their own files

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license information here]

## Support

For issues and questions:
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system details
- Check [LIMITATIONS.md](./LIMITATIONS.md) for format and size limits
- Review Docker logs: `docker-compose logs -f api`

## Acknowledgments

- Built on [LibreChat](https://librechat.ai)
- Uses OpenAI Whisper API for transcription
- ffmpeg for video/audio processing
