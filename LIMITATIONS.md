# Limitations and Supported Formats

This document outlines the limitations, supported file formats, and model requirements for the Stanford AI Playground file processing features.

## File Size Limitations

### Audio Files
- **Status**: ✅ **Working with Multimodal Providers** (Google/Gemini, OpenRouter) and ✅ **Working with STT Transcription** (for non-multimodal providers)
- **Multimodal Providers**:
  - Google/Gemini: Supports audio files directly, no transcription needed
  - OpenRouter: Supports audio files directly, no transcription needed
  - **Maximum file size**: Varies by provider (typically 20-100 MB)
- **STT Transcription Approach** (for non-multimodal providers like GPT-4):
  - **Maximum file size**: 25 MB (OpenAI Whisper API limit)
  - **Recommended size**: < 10 MB for optimal performance
  - **Processing time**: Approximately 1-2 seconds per minute of audio

### Video Files
-   **Status**: ✅ **Working with Multimodal Providers** (Google/Gemini, OpenRouter), ⚠️ **Not Working with STT Transcription**
-   **Multimodal Providers (Recommended)**:
    -   Google/Gemini: Supports video files directly, no transcription needed
    -   OpenRouter: Supports video files directly, no transcription needed
    -   **Maximum file size**: Varies by provider (typically 20-100 MB)
    -   **Processing**: Direct video processing by the LLM, preserves visual and audio information
-   **STT Transcription Approach** (for non-multimodal providers):
    -   **Status**: ⚠️ Currently not functional
    -   **Maximum file size**: 25 MB (after audio extraction)
    -   **Audio extraction**: Video files are processed to extract audio first, which must be ≤ 25 MB
    -   **Processing time**:
        -   Audio extraction: 5-30 seconds depending on video length and complexity
        -   Transcription: 1-2 seconds per minute of audio
    -   **Workaround**: Extract audio manually and upload as audio file (see Known Issues section)

### Document Files (PDF, DOCX, etc.)
- **Maximum file size**: 
  - OpenAI: 512 MB per file
  - Anthropic: 100 MB per file
  - Google: 20 MB per file
- **Recommended size**: < 10 MB for faster processing
- **Processing time**: Varies based on file size and content complexity

## Supported File Formats

### Audio Formats (for Transcription)
The system supports the following audio formats for Speech-to-Text (STT) transcription:

- **WAV** (`audio/wav`, `audio/x-wav`, `audio/wave`)
- **MP3** (`audio/mp3`, `audio/mpeg`, `audio/mpeg3`)
- **M4A** (`audio/mp4`, `audio/x-m4a`)
- **AAC** (`audio/aac`)
- **OGG** (`audio/ogg`, `audio/vorbis`, `application/ogg`)
- **FLAC** (`audio/flac`, `audio/x-flac`)
- **WebM** (`audio/webm`)
- **WMA** (`audio/wma`)
- **Opus** (`audio/opus`)

**Note**: All audio formats are converted/processed to be compatible with OpenAI's Whisper API.

### Video Formats (for Audio Extraction & Transcription)
The system supports the following video formats. Audio is extracted from these formats before transcription:

- **MP4** (`video/mp4`, `video/x-m4v`)
- **AVI** (`video/avi`)
- **MOV** (`video/mov`)
- **WebM** (`video/webm`)
- **MKV** (`video/mkv`)
- **M4V** (`video/m4v`)
- **3GP** (`video/3gp`)
- **OGV** (`video/ogv`)
- **MPEG** (`video/mpeg`, `video/mpg`)
- **WMV** (`video/wmv`)
- **FLV** (`video/flv`)

**Important**: 
- Video files must contain an audio stream for transcription to work
- If a video file has no audio track, the system will return an error message
- Audio is extracted using `ffmpeg` and converted to WAV format before transcription

### Document Formats (for Direct Chat without RAG)
The system supports the following document formats for direct file attachment and chat:

**Text Documents:**
- **PDF** (`application/pdf`)
- **DOCX** (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
- **DOC** (`application/msword`)
- **TXT** (`text/plain`)
- **Markdown** (`text/markdown`)
- **HTML** (`text/html`)

**Spreadsheets:**
- **XLSX** (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)
- **XLS** (`application/vnd.ms-excel`)
- **CSV** (`application/csv`)

**Presentations:**
- **PPTX** (`application/vnd.openxmlformats-officedocument.presentationml.presentation`)
- **PPT** (`application/vnd.ms-powerpoint`)

**Code Files:**
- **JavaScript** (`text/javascript`, `application/javascript`)
- **TypeScript** (`application/typescript`)
- **Python** (`text/x-python`, `text/x-script.python`)
- **Java** (`text/x-java`)
- **C/C++** (`text/x-c`, `text/x-c++`)
- **PHP** (`text/x-php`)
- **Ruby** (`text/x-ruby`)
- **SQL** (`application/sql`)
- **YAML** (`application/yaml`)
- **JSON** (`application/json`)
- **XML** (`application/xml`)

**Other:**
- **RTF** (`application/rtf`)
- **ZIP** (`application/zip`)
- **TAR** (`application/x-tar`)

**Note**: Document processing uses direct file attachment (without RAG/indexing). The AI model receives the file content directly in the conversation context.

## Model Requirements

### For Audio/Video Processing

**Option 1: Multimodal Providers (Recommended)**
-   **Google/Gemini**: Supports audio and video files directly
    -   **Required**: Google API key (`GOOGLE_API_KEY`)
    -   **Models**: Gemini models (e.g., `gemini-pro`, `gemini-pro-vision`)
-   **OpenRouter**: Supports audio and video files directly
    -   **Required**: OpenRouter API key
    -   **Models**: Various models that support multimodal input

**Option 2: STT Transcription (for non-multimodal providers)**
-   **Required**: OpenAI API key with access to Whisper API
-   **Model**: `whisper-1` (default)
-   **API Endpoint**: `https://api.openai.com/v1/audio/transcriptions`
-   **Alternative**: Can be configured to use Azure OpenAI or other Whisper-compatible services
-   **Note**: Video transcription via STT is currently not working

### For Video Audio Extraction
- **Required**: `ffmpeg` installed in the Docker container
- **Version**: ffmpeg 8.0.1 or later
- **Location**: `/usr/bin/ffmpeg` (automatically installed in Docker)
- **Capabilities**: 
  - Audio codec extraction (PCM, AAC, MP3, etc.)
  - Format conversion (to WAV for Whisper API)
  - Sample rate conversion (to 44.1kHz)

## Known Issues

### Video Transcription: ⚠️ Limited Support

-   **Status**: ✅ **Working with Multimodal Providers** (Google/Gemini, OpenRouter), ⚠️ **Not Working with STT Transcription**
-   **Recommended Solution**: Use a multimodal-capable provider (Google/Gemini, OpenRouter) which can process video files directly without transcription.
-   **For Non-Multimodal Providers**: Video transcription via STT is currently not functional. As a workaround, manually extract audio from video files using `ffmpeg` and upload the resulting audio file for transcription:
    ```bash
    ffmpeg -i video.mp4 -vn -acodec pcm_s16le -ar 44100 -ac 2 audio.wav
    ```
    Then upload `audio.wav` for transcription.


## Processing Limitations

### Audio/Video Processing

**Multimodal Providers (Google/Gemini, OpenRouter)**
- **Language Support**: All languages supported by the provider
- **Accuracy**: Depends on model capabilities and input quality
- **Processing**: Direct processing, no transcription step needed
- **Concurrent requests**: Limited by provider rate limits

**STT Transcription (Non-Multimodal Providers)**
- **Language Support**: All languages supported by OpenAI Whisper API
- **Accuracy**: Depends on audio quality, background noise, and language
- **Real-time factor**: ~0.1x (10 minutes of audio takes ~1 minute to process)
- **Concurrent requests**: Limited by API rate limits and server resources
- **Video Files**: ⚠️ Not supported - use multimodal providers for video

### Document Processing
- **Text extraction**: Automatic for PDF, DOCX, and other formats
- **OCR**: Not currently supported for scanned documents/images
- **Large documents**: May be truncated if exceeding model context window
- **Context window limits**:
  - GPT-4 Turbo: 128K tokens
  - GPT-4: 8K tokens
  - Claude 3.5: 200K tokens
  - Gemini Pro: 32K tokens

## Error Handling

### Common Errors and Solutions

1. **"Video file transcription not working"** ⚠️
   - **Cause**: Video transcription via STT (Speech-to-Text) is not functional for non-multimodal providers.
   - **Solution 1 (Recommended)**: Use a multimodal-capable provider (Google/Gemini or OpenRouter) which can process video files directly.
   - **Solution 2**: Extract audio manually from video and upload as audio file:
     ```bash
     ffmpeg -i video.mp4 -vn -acodec pcm_s16le -ar 44100 -ac 2 audio.wav
     ```
     Then upload `audio.wav` for transcription.

2. **"Video file does not contain an audio stream"**
   - **Cause**: Video file has no audio track, or audio stream detection is failing
   - **Solution**: 
     - Verify video has audio: `ffmpeg -i video.mp4 2>&1 | grep Audio`
     - If no audio, use a different video file
     - If audio exists but detection fails, extract manually (see workaround above)

3. **"File size exceeds 25 MB"**
   - **Cause**: Audio/video file is too large for Whisper API
   - **Solution**: Compress the file or split it into smaller segments

4. **"ffmpeg is not installed"**
   - **Cause**: ffmpeg is missing from the Docker container
   - **Solution**: Ensure Docker container has ffmpeg installed (automatically installed in our setup)

5. **"No STT schema is set"**
   - **Cause**: STT configuration is missing in `librechat.yaml`
   - **Solution**: Configure STT in `librechat.yaml` with OpenAI API key

6. **"Failed to extract audio from video"**
   - **Cause**: Video codec is unsupported, corrupted file, or known video transcription issue
   - **Solution**: 
     - Re-encode the video file or use a different format
     - Use manual audio extraction workaround (see Known Issues section)

## Performance Considerations

- **Network latency**: API calls to OpenAI/other providers add latency
- **File upload**: Large files take longer to upload
- **Processing queue**: Multiple simultaneous requests may be queued
- **Docker resources**: CPU and memory limits affect processing speed

## Security Considerations

- **File validation**: All uploaded files are validated for type and size
- **Temporary storage**: Extracted audio files are automatically cleaned up
- **API keys**: Stored securely in environment variables
- **File access**: Files are only accessible to the uploading user

