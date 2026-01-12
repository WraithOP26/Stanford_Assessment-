# Limitations and Supported Formats

This document outlines the limitations, supported file formats, and model requirements for the Stanford AI Playground file processing features.

## File Size Limitations

### Audio Files
- **Maximum file size**: 25 MB (OpenAI Whisper API limit)
- **Recommended size**: < 10 MB for optimal performance
- **Processing time**: Approximately 1-2 seconds per minute of audio

### Video Files
- **Status**: ⚠️ **Currently Not Working** - Video transcription is experiencing issues
- **Maximum file size**: 25 MB (after audio extraction, for transcription) - *when working*
- **Original video size**: No hard limit, but larger files take longer to process - *when working*
- **Audio extraction**: Video files are processed to extract audio first, which must be ≤ 25 MB - *when working*
- **Processing time**: 
  - Audio extraction: 5-30 seconds depending on video length and complexity - *when working*
  - Transcription: 1-2 seconds per minute of audio - *when working*
- **Workaround**: Extract audio manually and upload as audio file (see Known Issues section)

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

### For Audio/Video Transcription
- **Required**: OpenAI API key with access to Whisper API
- **Model**: `whisper-1` (default)
- **API Endpoint**: `https://api.openai.com/v1/audio/transcriptions`
- **Alternative**: Can be configured to use Azure OpenAI or other Whisper-compatible services

### For Document Processing
The system supports multiple AI providers for document chat:

1. **OpenAI** (GPT-4, GPT-4 Turbo, GPT-3.5)
   - Requires: `OPENAI_API_KEY`
   - Supports: All document formats listed above
   - Max file size: 512 MB

2. **Anthropic** (Claude 3, Claude 3.5)
   - Requires: `ANTHROPIC_API_KEY`
   - Supports: PDF, TXT, and other text formats
   - Max file size: 100 MB

3. **Google** (Gemini Pro, Gemini Ultra)
   - Requires: `GOOGLE_API_KEY` or `GOOGLE_APPLICATION_CREDENTIALS`
   - Supports: PDF, images, and text formats
   - Max file size: 20 MB

4. **Azure OpenAI**
   - Requires: `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_INSTANCE_NAME`, `AZURE_OPENAI_API_DEPLOYMENT_NAME`
   - Supports: Same as OpenAI
   - Max file size: 512 MB

5. **Custom Endpoints**
   - Supports any OpenAI-compatible API
   - Limitations depend on the specific endpoint configuration

### For Video Audio Extraction
- **Required**: `ffmpeg` installed in the Docker container
- **Version**: ffmpeg 8.0.1 or later
- **Location**: `/usr/bin/ffmpeg` (automatically installed in Docker)
- **Capabilities**: 
  - Audio codec extraction (PCM, AAC, MP3, etc.)
  - Format conversion (to WAV for Whisper API)
  - Sample rate conversion (to 44.1kHz)

## Known Issues

### Video Transcription
- **Status**: ⚠️ **Currently Not Working**
- **Issue**: Video file transcription is experiencing issues with audio extraction
- **Workaround**: 
  - Extract audio manually from video files using ffmpeg:
    ```bash
    ffmpeg -i video.mp4 -vn -acodec pcm_s16le -ar 44100 -ac 2 audio.wav
    ```
  - Upload the extracted audio file (WAV, MP3, etc.) for transcription
- **Root Cause**: Audio stream detection and extraction from video files is not functioning correctly
- **Expected Fix**: Future update will resolve video transcription functionality

## Processing Limitations

### Audio/Video Transcription
- **Language Support**: All languages supported by OpenAI Whisper API
- **Accuracy**: Depends on audio quality, background noise, and language
- **Real-time factor**: ~0.1x (10 minutes of audio takes ~1 minute to process)
- **Concurrent requests**: Limited by API rate limits and server resources
- **Video Files**: ⚠️ Currently not supported - use audio extraction workaround above

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
   - **Cause**: Known issue with video transcription functionality
   - **Solution**: Extract audio manually from video and upload as audio file:
     ```bash
     ffmpeg -i video.mp4 -vn -acodec pcm_s16le -ar 44100 -ac 2 audio.wav
     ```
     Then upload `audio.wav` for transcription

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

## Current Status Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Audio Transcription | ✅ Working | Supports WAV, MP3, M4A, OGG, FLAC, etc. |
| Video Transcription | ⚠️ Not Working | Use manual audio extraction workaround |
| Document Chat | ✅ Working | PDF, DOCX, TXT, etc. (without RAG) |

## Future Enhancements

Potential improvements not yet implemented:
- **Fix video transcription**: Resolve audio extraction issues for video files
- Support for larger video files (> 25 MB) with chunking
- OCR for scanned documents
- Batch processing for multiple files
- Custom language models for domain-specific transcription
- Real-time audio transcription streaming

