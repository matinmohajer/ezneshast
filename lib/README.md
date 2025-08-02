# Meeting Processing Library

This library provides a modular approach to processing meeting audio files, including transcription and summarization.

## Architecture

The library is organized into several focused modules:

### 1. AudioProcessor (`audio-processor.ts`)

Handles all audio processing operations:

- **File Management**: Saves uploaded files to temporary locations
- **Preprocessing**: Denoises, normalizes, and converts audio to optimal format
- **Chunking**: Splits audio into smaller segments for processing
- **Cleanup**: Removes temporary files

### 2. TranscriptionService (`transcription-service.ts`)

Manages audio-to-text transcription:

- **Chunk Processing**: Transcribes individual audio chunks
- **Retry Logic**: Handles API failures with automatic retries
- **Batch Processing**: Combines multiple chunk transcriptions
- **Error Handling**: Graceful failure handling for individual chunks

### 3. SummarizationService (`summarization-service.ts`)

Generates summaries from transcripts:

- **Markdown Generation**: Creates structured summaries in Markdown format
- **Persian Language Support**: Optimized for Persian meeting content
- **Configurable Prompts**: Customizable system prompts for different use cases

### 4. MeetingProcessor (`meeting-processor.ts`)

Main orchestrator that coordinates all services:

- **Workflow Management**: Coordinates the entire processing pipeline
- **Error Handling**: Centralized error management
- **Resource Management**: Ensures proper cleanup of temporary files
- **Configuration**: Manages service configurations

### 5. Configuration (`config.ts`)

Centralized configuration management:

- **Audio Settings**: Sample rate, chunk duration, channels
- **API Settings**: Model selection, temperature, retry counts
- **Filter Settings**: Audio processing filter parameters

## Usage

### Basic Usage

```typescript
import { MeetingProcessor } from "./lib/meeting-processor";
import { MEETING_PROCESSOR_CONFIG } from "./lib/config";

const processor = new MeetingProcessor(apiKey, MEETING_PROCESSOR_CONFIG);
const result = await processor.processMeeting(fileBuffer);
```

### Custom Configuration

```typescript
const customConfig = {
  audioProcessor: {
    chunkDuration: 15, // 15-second chunks
    sampleRate: 22050, // Higher quality
  },
  transcription: {
    temperature: 0.2, // More conservative
    maxRetries: 5, // More retries
  },
  summarization: {
    temperature: 0.05, // Very conservative
  },
};

const processor = new MeetingProcessor(apiKey, customConfig);
```

### Individual Services

```typescript
import { AudioProcessor } from "./lib/audio-processor";
import { TranscriptionService } from "./lib/transcription-service";
import { SummarizationService } from "./lib/summarization-service";

// Use services independently
const audioProcessor = new AudioProcessor();
const transcriptionService = new TranscriptionService(apiKey);
const summarizationService = new SummarizationService(apiKey);
```

## Configuration Options

### AudioProcessor

- `chunkDuration`: Duration of each audio chunk in seconds (default: 30)
- `sampleRate`: Audio sample rate in Hz (default: 16000)
- `channels`: Number of audio channels (default: 1)

### TranscriptionService

- `model`: Whisper model to use (default: "whisper-large-v3")
- `language`: Language code (default: "fa" for Persian)
- `temperature`: Creativity level (default: 0.41)
- `prompt`: Custom transcription prompt
- `maxRetries`: Number of retry attempts (default: 3)

### SummarizationService

- `model`: LLM model for summarization (default: "llama-3.3-70b-versatile")
- `temperature`: Creativity level (default: 0.1)
- `systemPrompt`: Custom system prompt for summarization

## Error Handling

The library includes comprehensive error handling:

- **Graceful Degradation**: Individual chunk failures don't stop the entire process
- **Retry Logic**: Automatic retries for transient API failures
- **Resource Cleanup**: Temporary files are always cleaned up, even on errors
- **Detailed Logging**: Comprehensive logging for debugging

## Performance Considerations

- **Chunking**: Audio is split into manageable chunks to handle large files
- **Parallel Processing**: Chunks can be processed in parallel (future enhancement)
- **Memory Management**: Temporary files are used to avoid memory issues
- **API Optimization**: Configurable retry logic and error handling

## Future Enhancements

- **Parallel Processing**: Process multiple chunks simultaneously
- **Streaming**: Real-time processing for live audio
- **Caching**: Cache intermediate results
- **Progress Tracking**: Real-time progress updates
- **Multiple Language Support**: Enhanced language detection and support
